import { handleBunnyUploadRequest } from '@/lib/bunny-upload-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handleBunnyUploadRequest('refresh', req);
}
