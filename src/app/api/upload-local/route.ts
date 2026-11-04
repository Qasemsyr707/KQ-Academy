import { handleFileUpload } from '@/lib/file-upload';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleFileUpload(request, true);
}
