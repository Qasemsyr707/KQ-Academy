import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

export class PrivateFileError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export interface PrivateFileMetadata {
  fileKey: string; ownerId: string; name: string; mimeType: string;
  size: number; sha256: string; createdAt: string;
}

export function isPrivateFileId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function within(base: string, target: string) {
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function samePath(first: string, second: string) {
  const a = path.resolve(first);
  const b = path.resolve(second);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function forbiddenDirectories() {
  const directories = [path.join(process.cwd(), 'public'), path.resolve('/data/bunny-uploads'), path.join(process.cwd(), '.data', 'bunny-uploads')];
  if (process.env.BUNNY_UPLOAD_STATE_DIR) directories.push(path.resolve(process.env.BUNNY_UPLOAD_STATE_DIR));
  if (process.env.NODE_ENV === 'production') directories.push(process.cwd());
  return directories;
}

async function noSymlinks(directory: string) {
  // Resolve the nearest existing ancestor. Comparing its canonical path detects
  // symlinks anywhere in that path without requiring access to unrelated parent
  // directory entries (e.g. a sandbox permits a temp directory but not its home).
  for (let current = path.resolve(directory);;) {
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) throw new PrivateFileError(500, 'مسار تخزين المستندات غير آمن');
      const resolved = path.resolve(await realpath(current));
      if (!samePath(resolved, current)) throw new PrivateFileError(500, 'مسار تخزين المستندات غير آمن');
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      current = parent;
    }
  }
}

function storageDirectory() {
  const configured = process.env.DOCUMENT_STORAGE_DIR;
  if (process.env.NODE_ENV === 'production' && (!configured || !path.isAbsolute(configured))) throw new PrivateFileError(500, 'يجب إعداد مسار دائم ومطلق لتخزين المستندات');
  const directory = path.resolve(configured || path.join(process.cwd(), '.data', 'documents'));
  if (forbiddenDirectories().some(base => within(path.resolve(base), directory))) throw new PrivateFileError(500, 'تخزين المستندات يجب أن يكون خاصاً وخارج إصدار التطبيق ومنفصلاً عن ملفات الفيديو');
  return directory;
}

async function baseDirectory(create: boolean): Promise<string | null> {
  const directory = storageDirectory();
  await noSymlinks(directory);
  if (create) await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    if (!(await lstat(directory)).isDirectory()) throw new PrivateFileError(500, 'مسار تخزين المستندات غير صالح');
    const resolved = await realpath(directory);
    if (!samePath(resolved, directory)) throw new PrivateFileError(500, 'مسار تخزين المستندات غير آمن');
    // A public/Bunny directory could itself be a symlink to this otherwise
    // canonical storage path. Resolve forbidden roots before allowing writes.
    for (const forbidden of forbiddenDirectories()) {
      let canonical: string;
      try { canonical = await realpath(forbidden); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
      if (within(canonical, resolved)) throw new PrivateFileError(500, 'مسار المستندات مكشوف أو مشترك مع ملفات الفيديو');
    }
    return resolved;
  } catch (error) { if (!create && (error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

async function syncDirectory(directory: string) {
  if (process.platform === 'win32') return;
  const handle = await open(directory, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

async function writeImmutable(filename: string, bytes: Buffer) {
  const handle = await open(filename, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW || 0), 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}

export async function storePrivateFile(bytes: Buffer, input: { ownerId: string; name: string; mimeType: string }): Promise<PrivateFileMetadata> {
  if (!input.ownerId || !input.name || !input.mimeType || !bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new PrivateFileError(400, 'بيانات المستند غير صالحة');
  const base = (await baseDirectory(true))!;
  const fileKey = randomUUID();
  const temporary = path.join(base, `.pending-${fileKey}`);
  await mkdir(temporary, { mode: 0o700 });
  const metadata: PrivateFileMetadata = { fileKey, ownerId: input.ownerId, name: input.name.slice(0, 255), mimeType: input.mimeType,
    size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), createdAt: new Date().toISOString() };
  await writeImmutable(path.join(temporary, 'original'), bytes);
  await writeImmutable(path.join(temporary, 'metadata.json'), Buffer.from(JSON.stringify(metadata)));
  await syncDirectory(temporary);
  // Persist all parent entries as well, including a freshly created storage root.
  for (let current = base;;) {
    await syncDirectory(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  await rename(temporary, path.join(base, fileKey));
  await syncDirectory(base);
  return metadata;
}

async function safeFile(directory: string, filename: string, maxBytes: number): Promise<Buffer> {
  const target = path.join(directory, filename);
  const stat = await lstat(target);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > maxBytes) throw new PrivateFileError(422, 'ملف المستند غير صالح');
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const actual = await handle.stat();
    if (!actual.isFile() || actual.size > maxBytes) throw new PrivateFileError(422, 'ملف المستند غير صالح');
    const chunks: Buffer[] = [];
    let size = 0;
    for (;;) {
      const chunk = Buffer.alloc(Math.min(64 * 1024, maxBytes + 1 - size));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (!bytesRead) break;
      size += bytesRead;
      if (size > maxBytes) throw new PrivateFileError(422, 'حجم المستند لا يطابق بياناته');
      chunks.push(chunk.subarray(0, bytesRead));
    }
    return Buffer.concat(chunks, size);
  } finally { await handle.close(); }
}

async function readMetadata(id: string): Promise<{ directory: string; metadata: PrivateFileMetadata } | null> {
  if (!isPrivateFileId(id)) throw new PrivateFileError(400, 'معرّف المستند غير صالح');
  const fileKey = id.toLowerCase();
  const base = await baseDirectory(false);
  if (!base) return null;
  const directory = path.join(base, fileKey);
  try {
    const stat = await lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory() || !samePath(await realpath(directory), directory)) throw new PrivateFileError(422, 'مسار المستند غير صالح');
    let metadata: PrivateFileMetadata;
    try { metadata = JSON.parse((await safeFile(directory, 'metadata.json', 8192)).toString('utf8')); }
    catch (error) { if (error instanceof PrivateFileError) throw error; throw new PrivateFileError(422, 'بيانات المستند تالفة'); }
    if (!metadata || metadata.fileKey !== fileKey || typeof metadata.ownerId !== 'string' || !metadata.ownerId
      || typeof metadata.name !== 'string' || !metadata.name || metadata.name.length > 255
      || typeof metadata.mimeType !== 'string' || !metadata.mimeType || metadata.mimeType.length > 200
      || !Number.isSafeInteger(metadata.size) || metadata.size <= 0 || metadata.size > MAX_DOCUMENT_BYTES
      || typeof metadata.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(metadata.sha256)
      || typeof metadata.createdAt !== 'string' || !Number.isFinite(Date.parse(metadata.createdAt))) throw new PrivateFileError(422, 'بيانات المستند تالفة');
    return { directory, metadata };
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

export async function readPrivateFileMetadata(id: string): Promise<PrivateFileMetadata | null> {
  return (await readMetadata(id))?.metadata ?? null;
}

export async function readPrivateFile(id: string): Promise<{ metadata: PrivateFileMetadata; bytes: Buffer } | null> {
  const result = await readMetadata(id);
  if (!result) return null;
  let bytes: Buffer;
  try { bytes = await safeFile(result.directory, 'original', result.metadata.size); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new PrivateFileError(422, 'الملف الأصلي غير متوفر'); throw error; }
  if (bytes.length !== result.metadata.size || createHash('sha256').update(bytes).digest('hex') !== result.metadata.sha256) throw new PrivateFileError(422, 'بصمة المستند لا تطابق الملف الأصلي');
  return { metadata: result.metadata, bytes };
}

const LEGACY_IMAGE_ID = /^c[a-z0-9]{24}$/i;

async function legacyImageDirectory(id: string, create: boolean): Promise<string | null> {
  if (!LEGACY_IMAGE_ID.test(id)) throw new PrivateFileError(400, 'معرّف الصورة غير صالح');
  // Old publicly referenced images can still be read before a document volume
  // is configured. A missing sidecar never grants uploader ownership.
  if (!create && process.env.NODE_ENV === 'production' && !process.env.DOCUMENT_STORAGE_DIR) return null;
  const base = await baseDirectory(create);
  if (!base) return null;
  const directory = path.join(base, '.legacy-images');
  await noSymlinks(directory);
  if (create) await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(await realpath(directory), directory)) throw new PrivateFileError(422, 'مسار ملكية الصورة غير صالح');
    return directory;
  } catch (error) { if (!create && (error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

export async function readLegacyImageOwner(id: string): Promise<string | null> {
  const base = await legacyImageDirectory(id, false);
  if (!base) return null;
  const directory = path.join(base, id.toLowerCase());
  try {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(await realpath(directory), directory)) throw new PrivateFileError(422, 'مسار ملكية الصورة غير صالح');
    const value = JSON.parse((await safeFile(directory, 'owner.json', 8192)).toString('utf8'));
    if (value?.id !== id.toLowerCase() || typeof value.ownerId !== 'string' || !value.ownerId || value.ownerId.length > 200) throw new PrivateFileError(422, 'بيانات ملكية الصورة تالفة');
    return value.ownerId;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    if (error instanceof PrivateFileError) throw error;
    throw new PrivateFileError(422, 'بيانات ملكية الصورة تالفة');
  }
}

/** Retain preview ownership for the existing StoredFile image fallback without
 * changing its database shape or granting other users an unbound image. */
export async function recordLegacyImageOwner(id: string, ownerId: string): Promise<void> {
  if (typeof ownerId !== 'string' || !ownerId || ownerId.length > 200) throw new PrivateFileError(400, 'مالك الصورة غير صالح');
  const base = (await legacyImageDirectory(id, true))!;
  const directory = path.join(base, id.toLowerCase());
  try { await mkdir(directory, { mode: 0o700 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (await readLegacyImageOwner(id) === ownerId) return;
    throw new PrivateFileError(409, 'سجل ملكية الصورة موجود أو قيد الحفظ؛ لا يمكن تغيير المالك');
  }
  const temporary = path.join(directory, `${randomUUID()}.json`);
  await writeImmutable(temporary, Buffer.from(JSON.stringify({ id: id.toLowerCase(), ownerId })));
  await syncDirectory(directory);
  await rename(temporary, path.join(directory, 'owner.json'));
  for (let current = directory;;) {
    await syncDirectory(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
