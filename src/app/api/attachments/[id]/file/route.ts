import { serveAttachmentFile } from '@/lib/private-file-delivery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type AttachmentContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: AttachmentContext) {
  return serveAttachmentFile(request, (await params).id, false);
}

export async function HEAD(request: Request, { params }: AttachmentContext) {
  return serveAttachmentFile(request, (await params).id, true);
}
