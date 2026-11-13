import { prisma } from '@/lib/db';
import { getBunnyPlaybackUrl } from '@/lib/bunny-playback';
import { assertBunnyVideoReady } from '@/lib/bunny-upload-server';
import { safeMediaUrl } from '@/lib/media-url';

export interface LessonViewer { id: string; role?: string }
interface LessonCourse {
  id: string;
  instructorId: string;
  status: string;
  price: number;
  priceSYP: number;
}

export class LessonPlaybackError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function isPublicLesson(course: Pick<LessonCourse, 'status' | 'price' | 'priceSYP'>, isFree: boolean): boolean {
  return course.status === 'PUBLISHED' && (isFree || (course.price === 0 && course.priceSYP === 0));
}

export function managesLessonCourse(course: Pick<LessonCourse, 'instructorId'>, viewer?: LessonViewer | null): boolean {
  return !!viewer && ((viewer.role === 'INSTRUCTOR' && course.instructorId === viewer.id)
    || ['ADMIN', 'OWNER'].includes(viewer.role ?? ''));
}

/** Every playback request checks the real lesson relation before exposing a URL
 * or creating a player token. A lesson ID supplied by the browser grants nothing. */
export async function getLessonPlayback(lessonId: string, viewer?: LessonViewer | null): Promise<string> {
  if (!/^c[a-z0-9]{24}$/i.test(lessonId)) throw new LessonPlaybackError(400, 'الدرس غير صالح');
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      videoUrl: true,
      isLive: true,
      chapter: { select: { isFree: true, course: { select: {
        id: true, instructorId: true, status: true, price: true, priceSYP: true,
      } } } },
    },
  });
  if (!lesson) throw new LessonPlaybackError(404, 'الدرس غير موجود');
  const { course, isFree } = lesson.chapter;
  let allowed = managesLessonCourse(course, viewer) || isPublicLesson(course, isFree);
  if (!allowed && viewer) {
    allowed = !!await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: viewer.id, courseId: course.id } },
      select: { id: true },
    });
  }
  if (!allowed) throw new LessonPlaybackError(viewer ? 403 : 401, 'هذا الدرس متاح للمشتركين في الكورس فقط');
  if (lesson.isLive || !lesson.videoUrl) throw new LessonPlaybackError(404, 'الفيديو غير متاح للمشاهدة حالياً');
  if (!safeMediaUrl(lesson.videoUrl)) throw new LessonPlaybackError(422, 'رابط الفيديو غير صالح');
  await assertBunnyVideoReady(lesson.videoUrl);
  return getBunnyPlaybackUrl(lesson.videoUrl);
}
