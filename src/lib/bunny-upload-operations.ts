import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename } from 'node:fs/promises';
import path from 'node:path';

export interface BunnyOperation {
  userId: string;
  libraryId: string;
  operationId: string;
  courseId?: string;
  purpose: 'lesson' | 'preview' | 'short';
  title: string;
}

export class BunnyOperationError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function durableWrite(filename: string, value: unknown) {
  const handle = await open(filename, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(value), 'utf8');
    await handle.sync();
  } finally { await handle.close(); }
}

async function syncDirectory(directory: string) {
  // Windows does not expose directory fsync through node:fs. POSIX deployments
  // must persist directory entries as well as file contents before the POST.
  if (process.platform === 'win32') return;
  const handle = await open(directory, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

async function syncAncestors(directory: string) {
  for (let current = path.resolve(directory);;) {
    await syncDirectory(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

/** Metadata only. Put BUNNY_UPLOAD_STATE_DIR on persistent, shared storage for
 * every worker serving this installation. Never delete an uncertain operation:
 * the upstream POST might have succeeded even when its response was lost. */
export async function createOrGetBunnyOperation(
  operation: BunnyOperation,
  createVideo: () => Promise<string>,
): Promise<{ videoId: string; created: boolean }> {
  if (!/^[0-9a-f-]{36}$/i.test(operation.operationId)) throw new BunnyOperationError(400, 'Invalid operation ID');
  const userKey = createHash('sha256').update(operation.userId).digest('hex');
  const base = path.resolve(process.env.BUNNY_UPLOAD_STATE_DIR || path.join(process.cwd(), '.data', 'bunny-uploads'));
  const userDirectory = path.join(base, userKey);
  const directory = path.join(userDirectory, operation.operationId);
  await mkdir(userDirectory, { recursive: true, mode: 0o700 });
  let claimed = false;
  try { await mkdir(directory, { mode: 0o700 }); claimed = true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  if (!claimed) {
    let existing: BunnyOperation;
    try { existing = JSON.parse(await readFile(path.join(directory, 'operation.json'), 'utf8')); }
    catch { throw new BunnyOperationError(409, 'عملية الرفع قيد الإنشاء أو تحتاج مراجعة؛ لا تنشئ فيديو آخر تلقائياً'); }
    const fields: (keyof BunnyOperation)[] = ['userId', 'libraryId', 'operationId', 'courseId', 'purpose', 'title'];
    if (fields.some(key => existing[key] !== operation[key])) {
      throw new BunnyOperationError(409, 'معرّف عملية الرفع مرتبط بملف أو كورس آخر');
    }
    try {
      const result = JSON.parse(await readFile(path.join(directory, 'video.json'), 'utf8'));
      if (typeof result.videoId !== 'string') throw new Error('Invalid operation result');
      return { videoId: result.videoId, created: false };
    } catch { throw new BunnyOperationError(409, 'نتيجة إنشاء الفيديو لم تُحسم؛ أعد نفس العملية لاحقاً أو راجع الدعم دون إنشاء فيديو مكرر'); }
  }
  // Only the worker that created this durable directory can issue the POST.
  await durableWrite(path.join(directory, 'operation.json'), operation);
  // Sync every ancestor too: another worker can observe a recursively created
  // parent before that worker has made its directory entry durable.
  await syncAncestors(directory);
  const videoId = await createVideo();
  const temporary = path.join(directory, `${randomUUID()}.json`);
  await durableWrite(temporary, { videoId });
  await rename(temporary, path.join(directory, 'video.json'));
  await syncDirectory(directory);
  return { videoId, created: true };
}
