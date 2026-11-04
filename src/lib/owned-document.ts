import { isPrivateFileId, PrivateFileError, readPrivateFileMetadata } from '@/lib/private-file-storage';

/** An instructor cannot grant a new course access to someone else's upload by
 * pasting a known file key into a lesson, quiz, or attachment request. */
export async function assertOwnedDocumentReference(user: { id: string; role?: string }, url: unknown) {
  if (typeof url !== 'string') return;
  let pathname: string;
  try { pathname = decodeURIComponent(new URL(url, 'https://local.invalid').pathname); }
  catch { if (!url.includes('/api/files/')) return; pathname = '/api/files/invalid'; }
  if (!pathname.startsWith('/api/files/')) return;
  const match = /^\/api\/files\/([^/?#]+)$/.exec(url);
  if (!match || !isPrivateFileId(match[1])) {
    throw new PrivateFileError(400, 'أعد رفع الملف الأصلي عبر رفع المرفقات قبل إضافته');
  }
  const metadata = await readPrivateFileMetadata(match[1]);
  if (!metadata) throw new PrivateFileError(410, 'الملف الأصلي غير موجود؛ يرجى إعادة رفعه');
  if (metadata.ownerId !== user.id && !['ADMIN', 'OWNER'].includes(user.role || '')) {
    throw new PrivateFileError(403, 'غير مصرح بربط مستند يخص مستخدماً آخر');
  }
}
