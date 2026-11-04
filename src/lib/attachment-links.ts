/** Student-facing links never expose unverified external attachment sources. */
export function attachmentFileUrl(id: string, download = false): string {
  return `/api/attachments/${encodeURIComponent(id)}/file${download ? '?download=1' : ''}`;
}

export function attachmentRequiresReupload(url: unknown): boolean {
  if (typeof url !== 'string') return true;
  return !/^\/api\/files\/[A-Za-z0-9_-]+(?:\.pdf)?$/.test(url)
    && !/^\/uploads\/[A-Za-z0-9._-]+$/.test(url)
    && !/^\/api\/attachments\/[A-Za-z0-9_-]+\/file(?:\?download=1)?$/.test(url);
}

type Attachment = { id: string; url: string; requiresReupload?: boolean };
function protectAttachment<T extends Attachment>(attachment: T) {
  return {
    ...attachment,
    url: attachmentFileUrl(attachment.id),
    downloadUrl: attachmentFileUrl(attachment.id, true),
    requiresReupload: attachment.requiresReupload || attachmentRequiresReupload(attachment.url),
  };
}

/** Preserve the course shape while replacing attachment source URLs in every
 * scope. Authorization still happens on every file request, including HEAD. */
export function protectCourseAttachmentLinks<T>(course: T): T {
  if (!course || typeof course !== 'object') return course;
  const item = course as Record<string, unknown>;
  const protectedItem: Record<string, unknown> = { ...item };
  if (Array.isArray(item.attachments)) protectedItem.attachments = item.attachments.map(protectAttachment);
  if (Array.isArray(item.chapters)) protectedItem.chapters = item.chapters.map(protectCourseAttachmentLinks);
  if (Array.isArray(item.lessons)) protectedItem.lessons = item.lessons.map(protectCourseAttachmentLinks);
  return protectedItem as T;
}
