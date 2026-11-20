import { certificateDocument } from '@/lib/certificate-render';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ certId: string }> }) {
  return certificateDocument(req, (await params).certId, 'png');
}
