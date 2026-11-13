import { getBunnyPlaybackUrl } from '@/lib/bunny-playback';
import { protectCourseLessonSources } from '@/lib/lesson-links';

/** Call only for a published course or after course authorization. Public
 * trailers may be viewed, but never downgrade Bunny to an unsigned fallback. */
export function protectCoursePlaybackLinks<T extends { previewVideoUrl?: string | null }>(course: T): T {
  let previewVideoUrl: string | null = null;
  if (course.previewVideoUrl) {
    try { previewVideoUrl = getBunnyPlaybackUrl(course.previewVideoUrl); }
    catch { /* Fail closed without hiding the rest of the course catalogue. */ }
  }
  return protectCourseLessonSources({ ...course, previewVideoUrl });
}
