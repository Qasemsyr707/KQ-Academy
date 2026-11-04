import * as tus from 'tus-js-client';

const TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';
const RETRY_DELAYS = [0, 3000, 5000, 10000, 20000, 60000, 60000];
const EXPIRY_MARGIN_SECONDS = 120;
const STORAGE_PREFIX = 'kq:bunny-upload:v2:';
const PROCESSING_ATTEMPTS = 120;
const PROCESSING_INTERVAL_MS = 5000;

export type BunnyUploadState = 'Uploading' | 'Paused' | 'Retrying' | 'Processing' | 'Ready' | 'Failed';
export type BunnyUploadPurpose = 'lesson' | 'preview' | 'short';

export interface BunnyUploadResult {
  videoId: string;
  libraryId: string;
  embedUrl: string;
}

export interface BunnyUploadOptions {
  purpose: BunnyUploadPurpose;
  userId?: string;
  courseId?: string;
  operationId?: string;
  onProgress?: (percent: number) => void;
  onStateChange?: (state: BunnyUploadState) => void;
  signal?: AbortSignal;
}

interface UploadCredentials {
  videoId: string;
  libraryId: string;
  signature: string;
  expireTime: number;
  resumeToken: string;
}

type UploadCapability = Pick<UploadCredentials, 'videoId' | 'libraryId' | 'resumeToken'>
  & Partial<Pick<UploadCredentials, 'signature' | 'expireTime'>>;

interface UploadRecord {
  version: 2;
  userId?: string;
  operationId: string;
  courseId?: string;
  purpose: BunnyUploadPurpose;
  fileFingerprint: string;
  title: string;
  credentials?: UploadCapability;
  uploadUrl?: string;
  uploadFingerprint?: string;
  sessionExpireTime?: number;
  restarts: number;
  lostResource: boolean;
  transferred: boolean;
}

interface VideoState {
  state: 'uploading' | 'processing' | 'ready' | 'failed';
  videoId: string;
  libraryId: string;
  embedUrl?: string;
}

type UploadFailure = Error & {
  originalRequest?: tus.HttpRequest;
  originalResponse?: tus.HttpResponse | null;
  causingError?: Error | null;
};

const records = new Map<string, UploadRecord>();
const runningOperations = new Map<string, Promise<BunnyUploadResult>>();
const fileFingerprints = new WeakMap<File, Promise<string>>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BunnyUploadError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly method?: string,
    public readonly videoId?: string,
  ) {
    super(message);
    this.name = 'BunnyUploadError';
  }
}

export class BunnyUploadPaused extends Error {
  constructor() {
    super('تم إيقاف الرفع مؤقتاً؛ يمكنك استكماله بنفس الملف');
    this.name = 'BunnyUploadPaused';
  }
}

class VideoAlreadyReceived extends Error {
  constructor(public readonly video: VideoState) { super('Video already received'); }
}

class ExpiredResource extends Error {}

class RequestFailure extends Error {
  constructor(
    public readonly originalRequest: tus.HttpRequest,
    public readonly originalResponse: tus.HttpResponse,
  ) { super('Bunny TUS request failed'); }
}

function failureDetails(error: UploadFailure): UploadFailure {
  let current = error;
  let responseError = error;
  for (let depth = 0; current && depth < 12; depth++) {
    if (current instanceof BunnyUploadPaused || current instanceof BunnyUploadError || current instanceof VideoAlreadyReceived || current instanceof ExpiredResource) return current;
    if (current.originalResponse) responseError = current;
    if (!current.causingError) break;
    current = current.causingError as UploadFailure;
  }
  return responseError;
}

function safeUploadUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === 'https://video.bunnycdn.com' && url.pathname.startsWith('/tusupload/')
      && url.pathname.length > '/tusupload/'.length && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

function hasIdentity(value: unknown): value is Partial<UploadCredentials> & Pick<UploadCredentials, 'videoId' | 'libraryId'> {
  const data = value as Partial<UploadCredentials> | null;
  return !!data && typeof data.videoId === 'string' && UUID.test(data.videoId)
    && typeof data.libraryId === 'string' && /^\d+$/.test(data.libraryId);
}

function validateCredentials(value: unknown): UploadCredentials {
  const data = value as Partial<UploadCredentials> | null;
  const now = Math.floor(Date.now() / 1000);
  if (!hasIdentity(data) || typeof data.signature !== 'string' || !/^[a-f0-9]{64}$/i.test(data.signature)
    || typeof data.resumeToken !== 'string' || !data.resumeToken || !Number.isSafeInteger(data.expireTime)
    || data.expireTime! <= now + EXPIRY_MARGIN_SECONDS || data.expireTime! > now + 7 * 86400) {
    throw new BunnyUploadError('بيانات تفويض رفع الفيديو ناقصة أو منتهية الصلاحية');
  }
  return { videoId: data.videoId, libraryId: data.libraryId, signature: data.signature,
    expireTime: data.expireTime!, resumeToken: data.resumeToken };
}

// Read only three small samples, never buffer the complete video in the browser.
// Metadata plus content samples also distinguish files renamed/replaced on disk.
async function fingerprintFile(file: File): Promise<string> {
  let pending = fileFingerprints.get(file);
  if (!pending) {
    pending = (async () => {
      const metadata = JSON.stringify([file.name, file.size, file.type, file.lastModified]);
      if (!globalThis.crypto?.subtle || !file.slice || typeof file.slice(0, 1).arrayBuffer !== 'function') {
        // Without a content digest we allow in-memory retries only. Never match a
        // reselected file on metadata alone and accidentally resume other bytes.
        return `volatile-${globalThis.crypto.randomUUID()}`;
      }
      const size = file.size;
      const length = 64 * 1024;
      const starts = [...new Set([0, Math.max(0, Math.floor(size / 2) - length / 2), Math.max(0, size - length)])];
      const samples = await Promise.all(starts.map(start => file.slice(start, Math.min(size, start + length)).arrayBuffer()));
      const encoded = new TextEncoder().encode(metadata);
      const bytes = new Uint8Array(encoded.byteLength + samples.reduce((sum, sample) => sum + sample.byteLength, 0));
      bytes.set(encoded);
      let offset = encoded.byteLength;
      for (const sample of samples) { bytes.set(new Uint8Array(sample), offset); offset += sample.byteLength; }
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    })();
    fileFingerprints.set(file, pending);
  }
  return pending;
}

function saveRecord(key: string, record: UploadRecord) {
  records.set(key, record);
  // Credentials are scoped upload capabilities, never the Bunny API key.
  try { globalThis.localStorage?.setItem(key, JSON.stringify(record)); } catch { /* Private browsing/storage quota: retain this tab's operation. */ }
}

function readRecord(key: string): UploadRecord | undefined {
  const memory = records.get(key);
  if (memory) return memory;
  let raw: string | null | undefined;
  try { raw = globalThis.localStorage?.getItem(key); } catch { return undefined; }
  if (!raw) return undefined;
  try { return JSON.parse(raw) as UploadRecord; }
  catch { throw new BunnyUploadError('سجل الاستكمال غير صالح؛ لا يمكن إعادة استخدام جلسة الرفع'); }
}

function removeRecord(key: string) {
  records.delete(key);
  try { globalThis.localStorage?.removeItem(key); } catch { /* Storage may be unavailable. */ }
}

/** One operation, one VideoId. The caller calls complete() after saving the
 * verified Ready URL to the lesson/preview/short successfully. */
export function createBunnyUpload(file: File, title: string, options: BunnyUploadOptions) {
  let key: string | undefined;
  let record: UploadRecord;
  let active: tus.Upload | undefined;
  let rejectTransfer: ((reason: unknown) => void) | undefined;
  let pending: Promise<BunnyUploadResult> | undefined;
  let readyResult: BunnyUploadResult | undefined;
  let paused = false;
  let abortController: AbortController | undefined;

  const state = (value: BunnyUploadState) => options.onStateChange?.(value);
  const persist = () => { if (key) saveRecord(key, record); };
  const checkPaused = () => { if (paused || options.signal?.aborted) throw new BunnyUploadPaused(); };
  const context = () => ({ operationId: record.operationId, courseId: record.courseId, purpose: record.purpose });

  async function api(path: string, body: object): Promise<unknown> {
    checkPaused();
    const requestController = new AbortController();
    const signal = abortController?.signal;
    const cancel = () => requestController.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    const timer = setTimeout(cancel, 30000);
    try {
      let response: Response;
      try {
        response = await fetch(`/api/bunny/${path}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
          body: JSON.stringify(body), signal: requestController.signal,
        });
      } catch {
        checkPaused();
        throw new BunnyUploadError('تعذر الاتصال بخادم الرفع؛ استكمل المحاولة بنفس الملف', 0);
      }
      checkPaused();
      if (!response.ok) {
        throw new BunnyUploadError(response.status === 403
          ? 'لا تملك صلاحية استكمال هذا الفيديو أو انتهى إذن الاستكمال'
          : response.status === 404 ? 'لم يعد الفيديو موجوداً على Bunny؛ تعذر استكمال العملية'
            : 'تعذر التحقق من عملية رفع الفيديو؛ أعد المحاولة بنفس الملف', response.status);
      }
      try { return await response.json(); }
      catch { checkPaused(); throw new BunnyUploadError('استجابة خادم الرفع غير صالحة'); }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  }

  function validateVideo(value: unknown): VideoState {
    const data = value as VideoState & { operationId?: string };
    if (!hasIdentity(data) || !['uploading', 'processing', 'ready', 'failed'].includes(data.state)
      || (data.operationId !== undefined && data.operationId !== record.operationId)
      || (record.credentials && (data.videoId !== record.credentials.videoId || data.libraryId !== record.credentials.libraryId))) {
      throw new BunnyUploadError('هوية الفيديو لا تطابق عملية الرفع؛ تعذر الاستكمال الآمن');
    }
    return data;
  }

  async function authorize(): Promise<VideoState> {
    const previous = record.credentials;
    const value = await api(previous ? 'refresh-upload' : 'create-video', previous
      ? { ...context(), videoId: previous.videoId, resumeToken: previous.resumeToken }
      : { ...context(), title });
    const video = validateVideo(value);
    if (video.state === 'uploading') {
      record.credentials = validateCredentials(value);
      persist();
    } else if (!previous) {
      const resumeToken = (value as { resumeToken?: unknown }).resumeToken;
      if (typeof resumeToken !== 'string' || !resumeToken) throw new BunnyUploadError('إذن استكمال الفيديو غير صالح');
      record.credentials = { videoId: video.videoId, libraryId: video.libraryId, resumeToken };
      persist();
    }
    return video;
  }

  async function transfer() {
    checkPaused();
    const credentials = record.credentials!;
    await new Promise<void>((resolve, reject) => {
      rejectTransfer = reject;
      const upload = new tus.Upload(file, {
        endpoint: TUS_ENDPOINT,
        uploadUrl: record.uploadUrl,
        retryDelays: [...RETRY_DELAYS],
        chunkSize: 16 * 1024 * 1024,
        parallelUploads: 1,
        // URL storage is managed with the operation proof below. In particular,
        // never enumerate tus's legacy file-only fingerprints from localStorage.
        storeFingerprintForResuming: false,
        removeFingerprintOnSuccess: true,
        fingerprint: async () => `${record.fileFingerprint}:${credentials.libraryId}:${credentials.videoId}`,
        headers: {},
        metadata: { filetype: file.type || 'application/octet-stream', title },
        async onBeforeRequest(request) {
          checkPaused();
          if (request.getMethod() === 'POST' ? request.getURL() !== TUS_ENDPOINT
            : !safeUploadUrl(request.getURL()) || request.getURL() !== record.uploadUrl
              || record.uploadFingerprint !== `${record.fileFingerprint}:${record.credentials!.libraryId}:${record.credentials!.videoId}`) {
            throw new BunnyUploadError('عنوان جلسة الرفع غير صالح');
          }
          // Re-signing cannot extend the ORIGINAL session expiry. An expired
          // resource must be checked/recreated; its acknowledged parts are gone.
          if (record.uploadUrl && record.sessionExpireTime! <= Math.floor(Date.now() / 1000)) throw new ExpiredResource('TUS session expired');
          if (record.credentials!.expireTime! <= Math.floor(Date.now() / 1000) + EXPIRY_MARGIN_SECONDS) {
            state('Retrying');
            const video = await authorize();
            if (video.state !== 'uploading') throw new VideoAlreadyReceived(video);
          }
          checkPaused();
          const signed = record.credentials!;
          request.setHeader('AuthorizationSignature', signed.signature!);
          request.setHeader('AuthorizationExpire', String(signed.expireTime));
          request.setHeader('VideoId', signed.videoId);
          request.setHeader('LibraryId', signed.libraryId);
        },
        onAfterResponse(request, response) {
          if (response.getStatus() >= 400) {
            // Throw before tus's implicit HEAD -> POST fallback. Missing resources
            // and authorization failures need our explicit, bounded policy.
            throw new RequestFailure(request, response);
          }
          if (request.getMethod() === 'POST' && response.getStatus() === 201) {
            const location = response.getHeader('Location');
            let uploadUrl: string;
            try { uploadUrl = new URL(location ?? '', request.getURL()).toString(); }
            catch { throw new BunnyUploadError('عنوان جلسة الرفع غير صالح'); }
            if (!safeUploadUrl(uploadUrl)) throw new BunnyUploadError('عنوان جلسة الرفع غير صالح');
            record.uploadUrl = uploadUrl;
            record.uploadFingerprint = `${record.fileFingerprint}:${record.credentials!.libraryId}:${record.credentials!.videoId}`;
            record.sessionExpireTime = record.credentials!.expireTime!;
            persist();
          }
        },
        onShouldRetry(error) {
          const failure = failureDetails(error);
          if (paused || failure instanceof BunnyUploadPaused || failure instanceof VideoAlreadyReceived || failure instanceof BunnyUploadError || failure instanceof ExpiredResource) return false;
          const status = failure.originalResponse?.getStatus() ?? 0;
          const transient = status === 0 || status === 408 || status === 409 || status === 423 || status === 429 || status >= 500;
          if (transient) state('Retrying');
          return transient;
        },
        onProgress(sent, total) {
          if (!paused) {
            state('Uploading');
            options.onProgress?.(total > 0 ? Number(((sent / total) * 100).toFixed(2)) : 0);
          }
        },
        onSuccess() {
          record.transferred = true;
          record.uploadUrl = undefined;
          record.uploadFingerprint = undefined;
          record.sessionExpireTime = undefined;
          persist();
          resolve();
        },
        onError: reject,
      });
      active = upload;
      upload.start();
    });
    rejectTransfer = undefined;
    active = undefined;
  }

  function result(video: VideoState): BunnyUploadResult {
    const embedUrl = `https://iframe.mediadelivery.net/embed/${video.libraryId}/${video.videoId}`;
    if (video.embedUrl !== embedUrl) throw new BunnyUploadError('رابط الفيديو الجاهز غير صالح');
    readyResult = { videoId: video.videoId, libraryId: video.libraryId, embedUrl };
    record.uploadUrl = undefined;
    record.uploadFingerprint = undefined;
    record.sessionExpireTime = undefined;
    record.transferred = true;
    persist();
    options.onProgress?.(100);
    state('Ready');
    return readyResult;
  }

  async function waitForReady(initial?: VideoState): Promise<BunnyUploadResult> {
    state('Processing');
    let video = initial;
    for (let attempt = 0; attempt < PROCESSING_ATTEMPTS; attempt++) {
      checkPaused();
      if (video?.state === 'ready') return result(video);
      if (video?.state === 'failed') throw new BunnyUploadError('فشلت معالجة الفيديو على Bunny؛ لم يتم حفظ الفيديو كدرس جاهز');
      if (attempt > 0) {
        await new Promise<void>((resolve, reject) => {
          const signal = abortController!.signal;
          const cancel = () => { clearTimeout(timer); reject(new BunnyUploadPaused()); };
          const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, PROCESSING_INTERVAL_MS);
          signal.addEventListener('abort', cancel, { once: true });
          if (signal.aborted) cancel();
        });
      }
      try {
        const credentials = record.credentials;
        if (!credentials) throw new BunnyUploadError('تعذر التحقق من هوية الفيديو');
        video = validateVideo(await api('upload-status', { ...context(), videoId: credentials.videoId, resumeToken: credentials.resumeToken }));
        state('Processing');
        if (video.state === 'ready') return result(video);
        if (video.state === 'failed') throw new BunnyUploadError('فشلت معالجة الفيديو على Bunny؛ لم يتم حفظ الفيديو كدرس جاهز', 422);
      } catch (error) {
        if (error instanceof BunnyUploadError && (error.status === 0 || error.status === 429 || (error.status !== undefined && error.status >= 500))) {
          state('Retrying');
          continue;
        }
        throw error;
      }
    }
    // No re-upload after processing timeout. A manual resume checks Bunny again.
    throw new BunnyUploadError('الفيديو قيد المعالجة؛ اضغط استكمال للتحقق من جاهزيته لاحقاً');
  }

  async function execute(): Promise<BunnyUploadResult> {
    if (!['lesson', 'preview', 'short'].includes(options.purpose) || (options.purpose !== 'short' && !options.courseId)) {
      throw new BunnyUploadError('يجب تحديد الكورس والغرض من رفع الفيديو');
    }
    if (options.operationId && !UUID.test(options.operationId)) throw new BunnyUploadError('معرّف عملية الرفع غير صالح');
    const fileFingerprint = await fingerprintFile(file);
    checkPaused();
    key = `${STORAGE_PREFIX}${encodeURIComponent(options.userId ?? '')}:${encodeURIComponent(options.courseId ?? '')}:${options.purpose}:${fileFingerprint}`;

    const run = async () => {
      const previous = readRecord(key!);
      if (previous) {
        if (previous.version !== 2 || previous.userId !== options.userId || previous.fileFingerprint !== fileFingerprint || previous.purpose !== options.purpose
          || previous.courseId !== options.courseId || previous.title !== title || !UUID.test(previous.operationId)
          || !Number.isInteger(previous.restarts) || previous.restarts < 0 || previous.restarts > 1
          || (options.operationId && options.operationId !== previous.operationId)
          || (previous.uploadUrl && (!previous.credentials || !safeUploadUrl(previous.uploadUrl) || !Number.isSafeInteger(previous.sessionExpireTime)
            || previous.uploadFingerprint !== `${fileFingerprint}:${previous.credentials.libraryId}:${previous.credentials.videoId}`))
          || (previous.credentials && !hasIdentity(previous.credentials))) {
          throw new BunnyUploadError('محاولة الاستكمال القديمة لا تطابق الملف أو الفيديو الحالي');
        }
        record = previous;
      } else {
        record = { version: 2, userId: options.userId, operationId: options.operationId ?? crypto.randomUUID(), courseId: options.courseId,
          purpose: options.purpose, title, fileFingerprint, restarts: 0, lostResource: false, transferred: false };
      }
      persist(); // Persist the operation ID BEFORE create-video, even if its response is lost.
      const existing = runningOperations.get(record.operationId);
      if (existing) return existing;
      const operation = (async () => {
        let video = await authorize();
        checkPaused();
        if (video.state !== 'uploading' || record.transferred) return waitForReady(video);
        if (record.lostResource) {
          if (record.restarts >= 1) throw new BunnyUploadError('تعذر استرداد جلسة الرفع بعد المحاولة المحدودة؛ لم يتم إنشاء فيديو مكرر');
          record.restarts++;
          record.lostResource = false;
          record.uploadUrl = undefined;
          record.uploadFingerprint = undefined;
          record.sessionExpireTime = undefined;
          persist();
          options.onProgress?.(0);
        }
        for (;;) {
          try {
            state('Uploading');
            await transfer();
            return waitForReady();
          } catch (error) {
            await active?.abort(); // Local abort only: never DELETE the video/resource.
            active = undefined;
            const failure = failureDetails(error as UploadFailure);
            if (failure instanceof VideoAlreadyReceived) return waitForReady(failure.video);
            if (paused || failure instanceof BunnyUploadPaused) throw new BunnyUploadPaused();
            const status = failure.originalResponse?.getStatus();
            const method = failure.originalRequest?.getMethod();
            const missingResource = failure instanceof ExpiredResource || (method === 'PATCH' || method === 'HEAD') && (status === 404 || status === 410);
            if (missingResource) {
              // A server-deleted resource has no resumable bytes. Forget the URL
              // BEFORE calling the API, and only restart at zero for the SAME video.
              record.uploadUrl = undefined;
              record.uploadFingerprint = undefined;
              record.sessionExpireTime = undefined;
              record.lostResource = true;
              persist();
              state('Retrying');
              video = await authorize();
              if (video.state !== 'uploading') return waitForReady(video);
              if (record.restarts < 1) {
                record.restarts++;
                record.lostResource = false;
                persist();
                options.onProgress?.(0);
                continue;
              }
            }
            if (failure instanceof BunnyUploadError) throw failure;
            throw new BunnyUploadError(missingResource
              ? 'انتهت جلسة الرفع وتعذر استردادها بعد المحاولة المحدودة؛ لم يتم إنشاء فيديو مكرر'
              : `فشل رفع الفيديو${status ? ` (${method ?? 'TUS'} ${status})` : '؛ تحقق من الاتصال واضغط استكمال'}`,
            status, method, record.credentials?.videoId);
          }
        }
      })();
      runningOperations.set(record.operationId, operation);
      try { return await operation; }
      finally { if (runningOperations.get(record.operationId) === operation) runningOperations.delete(record.operationId); }
    };

    // Browsers without Web Locks retain server-side creation idempotency and
    // same-tab de-duplication. Supporting browsers also prevent two tabs from
    // concurrently PATCHing different sessions for this operation.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(key, { ifAvailable: true }, lock => {
        if (!lock) throw new BunnyUploadError('هذا الملف يُرفع في نافذة أخرى؛ استكمله من تلك النافذة');
        return run();
      });
    }
    return run();
  }

  function start(): Promise<BunnyUploadResult> {
    if (pending) return pending;
    if (readyResult) { state('Ready'); return Promise.resolve(readyResult); }
    paused = false;
    state('Uploading');
    abortController = new AbortController();
    const abort = () => { void pause(); };
    options.signal?.addEventListener('abort', abort, { once: true });
    pending = execute().catch(error => {
      if (paused || error instanceof BunnyUploadPaused) { state('Paused'); throw new BunnyUploadPaused(); }
      state('Failed');
      if (error instanceof BunnyUploadError) throw error;
      throw new BunnyUploadError('تعذر إكمال رفع الفيديو؛ استكمل المحاولة بنفس الملف');
    }).finally(() => {
      pending = undefined;
      rejectTransfer = undefined;
      options.signal?.removeEventListener('abort', abort);
    });
    return pending;
  }

  async function pause(): Promise<void> {
    paused = true;
    state('Paused');
    abortController?.abort();
    const reject = rejectTransfer;
    await active?.abort();
    active = undefined;
    reject?.(new BunnyUploadPaused());
  }

  return {
    start,
    resume: start,
    pause,
    complete() { if (key) removeRecord(key); },
  };
}

export async function uploadBunnyVideo(
  file: File,
  title: string,
  onProgress?: (percent: number) => void,
  options: BunnyUploadOptions = { purpose: 'short' },
): Promise<BunnyUploadResult> {
  return createBunnyUpload(file, title, { ...options, onProgress: onProgress ?? options.onProgress }).start();
}
