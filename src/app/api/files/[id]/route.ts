import { servePrivateFile } from '@/lib/private-file-delivery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type FileContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: FileContext) {
  return servePrivateFile(request, (await params).id, false);
}

export async function HEAD(request: Request, { params }: FileContext) {
  return servePrivateFile(request, (await params).id, true);
}
