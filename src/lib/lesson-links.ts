import { parseBunnyEmbed } from '@/lib/bunny-embed';

/** Source URLs stay on the server. Public curricula contain IDs and titles;
 * the playback endpoint independently authorizes each request. */
export function lessonPlaybackEndpoint(id: string): string {
  return `/api/lessons/${encodeURIComponent(id)}/playback`;
}

type Lesson = { id: string; videoUrl?: string | null; content?: unknown; liveRoomName?: unknown; liveStartTime?: unknown };
export function protectLessonSource<T extends Lesson>(lesson: T, readable = true) {
  const { videoUrl, content, liveRoomName, liveStartTime, ...metadata } = lesson;
  return {
    ...metadata,
    videoUrl: null,
    hasVideo: !!videoUrl,
    isBunnyVideo: !!parseBunnyEmbed(videoUrl),
    playbackUrl: lessonPlaybackEndpoint(lesson.id),
    ...(readable ? { content, liveRoomName, liveStartTime } : {}),
  };
}

/** Public course and mobile catalog responses never contain lesson bodies or
 * reusable source URLs, even when a chapter is a free preview. */
export function protectCourseLessonSources<T>(course: T): T {
  if (!course || typeof course !== 'object') return course;
  const item = course as Record<string, unknown>;
  const result: Record<string, unknown> = { ...item };
  if (Array.isArray(item.chapters)) result.chapters = item.chapters.map(protectCourseLessonSources);
  if (Array.isArray(item.lessons)) {
    result.lessons = item.lessons.map(lesson => protectLessonSource(lesson as Lesson, false));
  }
  return result as T;
}
