import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { AttachmentAccessError, attachmentSessionUser, isAttachmentId, resolveAttachmentAccess, resolveAttachmentTarget,
  type AttachmentUser } from '@/lib/attachment-access';
import { DocumentValidationError, looksLikePdf, validatePdfBytes } from '@/lib/document-validation';
import { MAX_DOCUMENT_BYTES, PrivateFileError, isPrivateFileId, readLegacyImageOwner, readPrivateFile, readPrivateFileMetadata } from '@/lib/private-file-storage';

export const REUPLOAD_MESSAGE = 'الملف الأصلي غير موجود أو لم يُحفظ بصيغة صحيحة. يرجى إعادة رفع ملف PDF الأصلي من لوحة المدرّب.';
export const PRIVATE_DOCUMENT_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff',
};

export class FileDeliveryError extends Error {
  constructor(public readonly status: number, message: string, public readonly requiresReupload = false) { super(message); }
}

export type AttachmentSource = { kind: 'file'; id: string } | { kind: 'legacy'; filename: string } | { kind: 'unavailable' };
interface FileMetadata { id: string; name: string; mimeType: string; size: number; createdAt: Date; ownerId?: string }
interface OriginalFile { metadata: FileMetadata; bytes: Buffer }

export function isDeliveryFileId(value: unknown): value is string { return isPrivateFileId(value) || isAttachmentId(value); }

/** Only local identifiers are accepted; external URLs are never fetched. */
export function parseAttachmentSource(value: unknown, origin?: string): AttachmentSource {
  if (typeof value !== 'string' || !value || value.length > 2048 || value.startsWith('//') || value.includes('\\')) return { kind: 'unavailable' };
  let url: URL;
  try { url = new URL(value, origin ?? 'https://local-attachment.invalid'); } catch { return { kind: 'unavailable' }; }
  const relative = value.startsWith('/') && !value.startsWith('//');
  const trustedOrigins = [origin];
  try { if (process.env.NEXTAUTH_URL) trustedOrigins.push(new URL(process.env.NEXTAUTH_URL).origin); } catch { /* Invalid configuration grants no origin. */ }
  if ((!relative && !trustedOrigins.includes(url.origin)) || !['http:', 'https:'].includes(url.protocol)
    || url.username || url.password || url.hash) return { kind: 'unavailable' };
  const file = /^\/api\/files\/([^/]+)$/.exec(url.pathname);
  if (file && isDeliveryFileId(file[1])) return { kind: 'file', id: file[1] };
  const legacy = /^\/uploads\/([a-z0-9][a-z0-9._-]{0,240})$/i.exec(url.pathname);
  if (legacy && legacy[1] !== '.' && legacy[1] !== '..') return { kind: 'legacy', filename: legacy[1] };
  return { kind: 'unavailable' };
}

async function metadataForFile(id: string): Promise<FileMetadata | null> {
  if (!isDeliveryFileId(id)) throw new FileDeliveryError(400, 'معرّف الملف غير صالح');
  if (isPrivateFileId(id)) {
    const file = await readPrivateFileMetadata(id);
    return file ? { id, name: file.name, mimeType: file.mimeType, size: file.size,
      createdAt: new Date(file.createdAt), ownerId: file.ownerId } : null;
  }
  const legacy = await prisma.storedFile.findUnique({ where: { id }, select: { id: true, name: true, mimeType: true, size: true, createdAt: true } });
  return legacy ? { ...legacy, ownerId: (await readLegacyImageOwner(id)) ?? undefined } : null;
}

async function originalForFile(metadata: FileMetadata): Promise<OriginalFile> {
  if (metadata.size > MAX_DOCUMENT_BYTES) throw new FileDeliveryError(413, 'حجم المستند يتجاوز الحد المسموح به');
  if (isPrivateFileId(metadata.id)) {
    const file = await readPrivateFile(metadata.id);
    if (!file) throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
    return { metadata, bytes: file.bytes };
  }
  // Read legacy base64 only in a second query after access is authorized.
  const file = await prisma.storedFile.findUnique({ where: { id: metadata.id }, select: { data: true } });
  if (!file) throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
  if (file.data.length > Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4) throw new FileDeliveryError(413, 'حجم المستند يتجاوز الحد المسموح به');
  const bytes = Buffer.from(file.data, 'base64');
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new FileDeliveryError(bytes.length ? 413 : 410, REUPLOAD_MESSAGE, true);
  return { metadata, bytes };
}

function referenceUrls(id: string, request: Request) {
  const local = `/api/files/${id}`;
  const urls = [local, new URL(local, request.url).toString()];
  try { if (process.env.NEXTAUTH_URL) urls.push(new URL(local, process.env.NEXTAUTH_URL).toString()); } catch { /* Keep local reference. */ }
  return [...new Set(urls)];
}

async function isIntentionallyPublicImage(metadata: FileMetadata, request: Request) {
  // UUIDs are private originals. A pasted thumbnail/avatar reference must not
  // turn another user's private upload into an anonymous download capability.
  if (isPrivateFileId(metadata.id)) return false;
  if (!/^image\/(?:jpeg|png|gif|webp|avif)$/.test(metadata.mimeType)) return false;
  const urls = referenceUrls(metadata.id, request);
  const [course, avatar] = await Promise.all([
    prisma.course.findFirst({ where: { status: 'PUBLISHED', thumbnail: { in: urls } }, select: { id: true } }),
    prisma.user.findFirst({ where: { image: { in: urls } }, select: { id: true } }),
  ]);
  return !!(course || avatar);
}

async function authorizeFileReferences(user: AttachmentUser, metadata: FileMetadata, request: Request): Promise<'document' | 'image'> {
  const urls = referenceUrls(metadata.id, request);
  const [attachments, lessons, quizzes, submissions, receipts, walletReceipts] = await Promise.all([
    prisma.attachment.findMany({ where: { url: { in: urls } }, select: { lessonId: true, chapterId: true, courseId: true } }),
    prisma.lesson.findMany({ where: { videoUrl: { in: urls } }, select: { id: true } }),
    prisma.quiz.findMany({ where: { type: 'MANUAL_FILE', fileUrl: { in: urls } }, select: { chapterId: true } }),
    prisma.quizAttempt.findMany({ where: { answerFileUrl: { in: urls } }, select: { userId: true, quiz: { select: { chapterId: true } } } }),
    prisma.payment.findMany({ where: { receiptImage: { in: urls } }, select: { userId: true } }),
    prisma.walletTransaction.findMany({ where: { receiptImage: { in: urls } }, select: { userId: true } }),
  ]);
  const linked = attachments.length + lessons.length + quizzes.length + submissions.length + receipts.length + walletReceipts.length > 0;
  if (!linked && metadata.ownerId === user.id) return 'document';
  if (linked && ['ADMIN', 'OWNER'].includes(user.role ?? '')) return 'document';
  if ([...receipts, ...walletReceipts].some(receipt => receipt.userId === user.id)) {
    // A receipt row accepts a URL; its owner must not gain access by pasting
    // another uploader's UUID. Older ownerless image receipts remain readable,
    // but their actual bytes must still be an image, never a disguised PDF.
    if (metadata.ownerId === user.id) return 'document';
    if (!metadata.ownerId && /^image\/(?:jpeg|png|gif|webp|avif)$/.test(metadata.mimeType)) return 'image';
  }
  for (const submission of submissions) {
    if (submission.userId === user.id) return 'document';
    const target = await resolveAttachmentTarget({ chapterId: submission.quiz.chapterId });
    if (target.instructorId === user.id) return 'document';
  }
  const targets = [...attachments, ...lessons.map(lesson => ({ lessonId: lesson.id })), ...quizzes];
  for (const target of targets) {
    try { await resolveAttachmentAccess(user, target); return 'document'; }
    catch (error) { if (!(error instanceof AttachmentAccessError)) throw error; }
  }
  throw new AttachmentAccessError(403, 'لا تملك صلاحية الوصول إلى هذا الملف');
}

function imageMime(bytes: Buffer): string | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (bytes.length >= 16 && bytes.subarray(4, 8).toString('ascii') === 'ftyp' && /avif|avis/.test(bytes.subarray(8, Math.min(40, bytes.length)).toString('ascii'))) return 'image/avif';
  return null;
}

function disposition(name: string, download: boolean, pdf: boolean) {
  const normalized = (name || (pdf ? 'document.pdf' : 'document')).normalize('NFC')
    .replace(/[\u0000-\u001f\u007f/\\\ud800-\udfff]/g, '_').slice(0, 240);
  const filename = pdf && !/\.pdf$/i.test(normalized) ? `${normalized}.pdf` : normalized;
  let ascii = filename.replace(/[^\x20-\x7e]|[";]/g, '_');
  if (!/[a-z0-9]/i.test(ascii.replace(/\.pdf$/i, ''))) ascii = pdf ? 'document.pdf' : 'document';
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function byteRange(value: string | null, size: number): { start: number; end: number } | null | 'unsatisfiable' {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2]) || size < 1) return 'unsatisfiable';
  const first = match[1] ? Number(match[1]) : undefined;
  const last = match[2] ? Number(match[2]) : undefined;
  if ((first !== undefined && !Number.isSafeInteger(first)) || (last !== undefined && !Number.isSafeInteger(last))) return 'unsatisfiable';
  if (first === undefined) {
    if (!last) return 'unsatisfiable';
    return { start: Math.max(0, size - last), end: size - 1 };
  }
  if (first >= size || (last !== undefined && last < first)) return 'unsatisfiable';
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}

async function respondOriginal(request: Request, original: OriginalFile, headOnly: boolean, publicImage = false, expectedPdf = false, expectedImage = false) {
  const { metadata, bytes } = original;
  const pdf = expectedPdf || metadata.mimeType === 'application/pdf' || /\.pdf$/i.test(metadata.name) || looksLikePdf(bytes);
  let mimeType: string;
  if (pdf) {
    await validatePdfBytes(bytes);
    if (publicImage || expectedImage) throw new FileDeliveryError(415, 'مرجع الصورة لا يحتوي على صورة صالحة');
    mimeType = 'application/pdf';
  } else if (metadata.mimeType.startsWith('image/')) {
    const detected = imageMime(bytes);
    if (!detected) throw new FileDeliveryError(415, 'محتوى الصورة غير صالح؛ يرجى إعادة رفع الملف الأصلي', true);
    mimeType = detected;
  } else { mimeType = 'application/octet-stream'; }
  const download = new URL(request.url).searchParams.get('download') === '1' || mimeType === 'application/octet-stream';
  const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`;
  const headers = new Headers(PRIVATE_DOCUMENT_HEADERS);
  if (publicImage) {
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
    headers.set('CDN-Cache-Control', 'public, s-maxage=300');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=300');
    headers.delete('Pragma');
  }
  headers.set('Content-Type', mimeType);
  headers.set('Content-Disposition', disposition(metadata.name, download, pdf));
  headers.set('Accept-Ranges', 'bytes');
  headers.set('ETag', etag);
  const modified = Number.isFinite(metadata.createdAt.getTime()) ? metadata.createdAt : new Date(0);
  headers.set('Last-Modified', modified.toUTCString());
  // Private documents ignore old public-cache validators and authorize afresh.
  if (publicImage && request.headers.get('if-none-match')?.split(',').map(value => value.trim()).includes(etag)) {
    return new Response(null, { status: 304, headers });
  }
  const ifRange = request.headers.get('if-range');
  const rangeAllowed = !ifRange || ifRange === etag || (!ifRange.startsWith('W/') && Number.isFinite(Date.parse(ifRange))
    && Math.floor(modified.getTime() / 1000) <= Math.floor(Date.parse(ifRange) / 1000));
  const range = rangeAllowed ? byteRange(request.headers.get('range'), bytes.length) : null;
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${bytes.length}`); headers.set('Content-Length', '0');
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${bytes.length}`);
    headers.set('Content-Length', String(range.end - range.start + 1));
    return new Response(headOnly ? null : new Uint8Array(bytes.subarray(range.start, range.end + 1)), { status: 206, headers });
  }
  headers.set('Content-Length', String(bytes.length));
  return new Response(headOnly ? null : new Uint8Array(bytes), { status: 200, headers });
}

async function legacyOriginal(filename: string, name: string): Promise<OriginalFile> {
  const configured = process.env.DOCUMENT_LEGACY_STORAGE_DIR;
  if (!configured || !path.isAbsolute(configured)) throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
  try {
    const base = await realpath(configured);
    const target = path.resolve(base, filename);
    if (path.dirname(target) !== base) throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || !stat.isFile() || await realpath(target) !== target) throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
    if (stat.size > MAX_DOCUMENT_BYTES) throw new FileDeliveryError(413, 'حجم المستند يتجاوز الحد المسموح به');
    const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    try {
      const actual = await handle.stat();
      if (!actual.isFile() || actual.size > MAX_DOCUMENT_BYTES) throw new FileDeliveryError(413, 'حجم المستند يتجاوز الحد المسموح به');
      const chunks: Buffer[] = [];
      let total = 0;
      for (;;) {
        // A concurrent writer cannot make readFile() allocate beyond the limit.
        const chunk = Buffer.alloc(Math.min(64 * 1024, MAX_DOCUMENT_BYTES + 1 - total));
        const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
        if (!bytesRead) break;
        total += bytesRead;
        if (total > MAX_DOCUMENT_BYTES) throw new FileDeliveryError(413, 'حجم المستند يتجاوز الحد المسموح به');
        chunks.push(chunk.subarray(0, bytesRead));
      }
      const bytes = Buffer.concat(chunks, total);
      if (!bytes.length) throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
      return { bytes, metadata: { id: filename, name, mimeType: /\.pdf$/i.test(name) ? 'application/pdf' : 'application/octet-stream', size: bytes.length, createdAt: actual.mtime } };
    } finally { await handle.close(); }
  } catch (error) {
    if (error instanceof FileDeliveryError) throw error;
    throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
  }
}

export function fileDeliveryErrorResponse(request: Request, error: unknown, headOnly: boolean) {
  const known = error instanceof FileDeliveryError || error instanceof AttachmentAccessError || error instanceof PrivateFileError || error instanceof DocumentValidationError;
  const status = known ? error.status : 500;
  const requiresReupload = error instanceof FileDeliveryError ? error.requiresReupload : error instanceof DocumentValidationError || (error instanceof PrivateFileError && error.status === 422);
  const message = known ? `${error.message}${requiresReupload && !error.message.includes(REUPLOAD_MESSAGE) ? ` ${REUPLOAD_MESSAGE}` : ''}` : 'تعذر فتح المرفق؛ يرجى المحاولة لاحقاً';
  const headers = new Headers(PRIVATE_DOCUMENT_HEADERS);
  const html = request.headers.get('accept')?.includes('text/html');
  headers.set('Content-Type', html ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8');
  if (headOnly) return new Response(null, { status, headers });
  if (!html) return new Response(JSON.stringify({ error: message, ...(requiresReupload ? { requiresReupload: true } : {}) }), { status, headers });
  const escaped = message.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  return new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تعذر فتح المرفق</title><body style="font-family:system-ui;max-width:42rem;margin:4rem auto;padding:1.5rem;line-height:1.8"><h1>تعذر فتح المرفق</h1><p>${escaped}</p><p><a href="/instructor/courses">لوحة المدرّب</a> · <a href="/dashboard">العودة إلى حسابك</a></p></body></html>`, { status, headers });
}

export async function servePrivateFile(request: Request, id: string, headOnly: boolean) {
  try {
    const metadata = await metadataForFile(id);
    if (!metadata) throw new FileDeliveryError(404, 'الملف غير موجود');
    const publicImage = await isIntentionallyPublicImage(metadata, request);
    const grant = publicImage ? 'image' : await authorizeFileReferences(await attachmentSessionUser(), metadata, request);
    return await respondOriginal(request, await originalForFile(metadata), headOnly, publicImage, false, grant === 'image');
  } catch (error) { return fileDeliveryErrorResponse(request, error, headOnly); }
}

export async function serveAttachmentFile(request: Request, id: string, headOnly: boolean) {
  try {
    if (!isAttachmentId(id)) throw new FileDeliveryError(400, 'معرّف المرفق غير صالح');
    const user = await attachmentSessionUser();
    const attachment = await prisma.attachment.findUnique({ where: { id }, select: { name: true, url: true, lessonId: true, chapterId: true, courseId: true } });
    if (!attachment) throw new FileDeliveryError(404, 'المرفق غير موجود');
    await resolveAttachmentAccess(user, attachment);
    const source = parseAttachmentSource(attachment.url, new URL(request.url).origin);
    if (source.kind === 'unavailable') throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
    if (source.kind === 'legacy') return await respondOriginal(request, await legacyOriginal(source.filename, attachment.name), headOnly);
    const metadata = await metadataForFile(source.id);
    if (!metadata) throw new FileDeliveryError(410, REUPLOAD_MESSAGE, true);
    return await respondOriginal(request, await originalForFile(metadata), headOnly, false, /\.pdf$/i.test(attachment.name));
  } catch (error) { return fileDeliveryErrorResponse(request, error, headOnly); }
}
