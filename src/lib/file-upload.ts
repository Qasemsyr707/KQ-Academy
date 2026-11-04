import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DOCUMENT_EXTENSIONS, DocumentValidationError, looksLikePdf, validateDocumentBytes } from '@/lib/document-validation';
import { MAX_DOCUMENT_BYTES, PrivateFileError, recordLegacyImageOwner, storePrivateFile } from '@/lib/private-file-storage';

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };
const MULTIPART_LIMIT = MAX_DOCUMENT_BYTES + 64 * 1024;
class UploadError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function readMultipart(request: Request): Promise<FormData> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) throw new UploadError(400, 'استخدم طلب رفع ملف صالحاً');
  if (Number(request.headers.get('content-length')) > MULTIPART_LIMIT) {
    await request.body?.cancel().catch(() => undefined);
    throw new UploadError(413, 'الحد الأقصى للمستند 20 MiB');
  }
  if (!request.body) throw new UploadError(400, 'الملف مفقود');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MULTIPART_LIMIT) {
        await reader.cancel().catch(() => undefined);
        throw new UploadError(413, 'الحد الأقصى للمستند 20 MiB');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return await new Response(Buffer.concat(chunks, size), { headers: { 'Content-Type': contentType } }).formData(); }
  catch { throw new UploadError(400, 'بيانات الملف غير صالحة'); }
}

async function uploadImage(bytes: Buffer, file: File, localImages: boolean, ownerId: string) {
  if (localImages) {
    const directory = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 180) || 'image'}`;
    await writeFile(path.join(directory, filename), bytes, { flag: 'wx' });
    return { url: `/uploads/${filename}`, filename: file.name };
  }
  // Preserve the existing image CDN and StoredFile fallback used by image callers.
  const base64Data = bytes.toString('base64');
  const form = new URLSearchParams({ key: process.env.IMGBB_API_KEY || '1f5ef4eb09ba47797cfb3d6f169c31b2', image: base64Data });
  if (file.name) form.append('name', file.name.split('.')[0]);
  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (response.ok) {
    const result = await response.json();
    if (result.success && typeof result.data?.url === 'string') return { url: result.data.url, filename: result.data.title };
  }
  const stored = await prisma.storedFile.create({
    data: { name: file.name || 'file', mimeType: file.type || 'image/jpeg', size: bytes.length, data: base64Data },
  });
  await recordLegacyImageOwner(stored.id, ownerId);
  return { url: `/api/files/${stored.id}`, filename: file.name || 'file' };
}

export async function handleFileUpload(request: Request, localImages = false) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (typeof user?.id !== 'string' || !user.id) throw new UploadError(401, 'غير مصرح');
    const form = await readMultipart(request);
    const file = form.get('file');
    if (!file || typeof file === 'string' || form.getAll('file').length !== 1) throw new UploadError(400, 'أرفق ملفاً واحداً');
    if (!file.size) throw new UploadError(400, 'الملف فارغ');
    if (file.size > MAX_DOCUMENT_BYTES) throw new UploadError(413, 'الحد الأقصى للمستند 20 MiB');
    const bytes = Buffer.from(await file.arrayBuffer());
    const name = file.name || 'file';
    const document = form.get('type') === 'document' || DOCUMENT_EXTENSIONS.test(name)
      || file.type === 'application/pdf' || looksLikePdf(bytes) || file.type.startsWith('audio/');
    if (!document) return NextResponse.json(await uploadImage(bytes, file, localImages, user.id), { status: 201, headers: PRIVATE_HEADERS });
    const courseId = form.get('courseId');
    if (courseId !== null && typeof courseId !== 'string') throw new UploadError(400, 'معرّف الكورس غير صالح');
    if (courseId) {
      if (!['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(user.role || '')) throw new UploadError(403, 'رفع مستندات الكورس متاح للمدرّب المخوّل فقط');
      if (courseId.length > 200) throw new UploadError(400, 'معرّف الكورس غير صالح');
      const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
      if (!course) throw new UploadError(404, 'الكورس غير موجود');
      if (course.instructorId !== user.id && !['ADMIN', 'OWNER'].includes(user.role || '')) throw new UploadError(403, 'هذا الكورس لا يخص المدرّب');
    }
    const mimeType = await validateDocumentBytes(bytes, name, file.type);
    // Unbound student submissions stay private to their uploader. Assigning an
    // upload to a lesson/quiz/attachment is authorized by those write endpoints.
    const stored = await storePrivateFile(bytes, { ownerId: user.id, name, mimeType });
    return NextResponse.json({ url: `/api/files/${stored.fileKey}`, filename: stored.name, mimeType: stored.mimeType,
      size: stored.size, fileKey: stored.fileKey, sha256: stored.sha256 }, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof UploadError || error instanceof DocumentValidationError || error instanceof PrivateFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
    }
    console.error('File upload failed');
    return NextResponse.json({ error: 'تعذر رفع الملف؛ لم يتم حفظ مستند غير صالح' }, { status: 500, headers: PRIVATE_HEADERS });
  }
}
