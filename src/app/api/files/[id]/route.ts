import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if ID contains a filename suffix (e.g. [id]/filename.pdf) or just ID
    const fileId = id.split('/')[0].split('.')[0];

    const file = await prisma.storedFile.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 });
    }

    const buffer = Buffer.from(file.data, 'base64');
    const safeName = encodeURIComponent(file.name || 'document.pdf');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${safeName}"; filename*=UTF-8''${safeName}`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Serve Stored File Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحميل الملف' }, { status: 500 });
  }
}
