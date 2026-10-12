import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const requestedType = formData.get('type') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'لم يتم العثور على ملف' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    
    const fileName = file.name || 'file';
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isDoc = requestedType === 'document' || isPdf || /\.(doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar)$/i.test(fileName);

    // If PDF or document, store directly in StoredFile table so it serves authentically as a PDF
    if (isPdf || isDoc) {
      const mimeType = isPdf ? 'application/pdf' : (file.type || 'application/octet-stream');
      
      const stored = await prisma.storedFile.create({
        data: {
          name: fileName,
          mimeType,
          size: buffer.length,
          data: base64Data,
        }
      });

      const fileUrl = `/api/files/${stored.id}`;
      return NextResponse.json({ url: fileUrl, filename: fileName }, { status: 201 });
    }

    // Otherwise, upload images to ImgBB
    const imgbbKey = process.env.IMGBB_API_KEY || '1f5ef4eb09ba47797cfb3d6f169c31b2';
    
    const imgbbFormData = new URLSearchParams();
    imgbbFormData.append('key', imgbbKey);
    imgbbFormData.append('image', base64Data);
    if (file.name) {
      imgbbFormData.append('name', file.name.split('.')[0]);
    }

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: imgbbFormData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ImgBB Error:', errorText);
      // Fallback to storing in StoredFile if ImgBB fails
      const stored = await prisma.storedFile.create({
        data: {
          name: fileName,
          mimeType: file.type || 'image/jpeg',
          size: buffer.length,
          data: base64Data,
        }
      });
      return NextResponse.json({ url: `/api/files/${stored.id}`, filename: fileName }, { status: 201 });
    }

    const data = await response.json();
    
    if (!data.success) {
      // Fallback to storing in StoredFile
      const stored = await prisma.storedFile.create({
        data: {
          name: fileName,
          mimeType: file.type || 'image/jpeg',
          size: buffer.length,
          data: base64Data,
        }
      });
      return NextResponse.json({ url: `/api/files/${stored.id}`, filename: fileName }, { status: 201 });
    }

    return NextResponse.json({ url: data.data.url, filename: data.data.title }, { status: 201 });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الرفع' }, { status: 500 });
  }
}
