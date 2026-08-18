import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'لم يتم العثور على ملف' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + '-' + file.name.replace(/\s+/g, '-');

    const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
    const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
    const pullZoneDomain = process.env.BUNNY_PULL_ZONE_DOMAIN; // e.g. "my-pull-zone.b-cdn.net"

    if (storageZoneName && accessKey && pullZoneDomain) {
      // Upload to Bunny.net Edge Storage
      const bunnyUrl = `https://storage.bunnycdn.com/${storageZoneName}/${filename}`;
      const response = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          AccessKey: accessKey,
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      });

      if (!response.ok) {
        throw new Error('فشل الرفع إلى Bunny.net');
      }

      const fileUrl = `https://${pullZoneDomain}/${filename}`;
      return NextResponse.json({ url: fileUrl, filename: file.name }, { status: 201 });
    } else {
      // Fallback: Local upload for development
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (err) {}
      
      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);
      
      const fileUrl = `/uploads/${filename}`;
      return NextResponse.json({ url: fileUrl, filename: file.name }, { status: 201 });
    }
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الرفع' }, { status: 500 });
  }
}
