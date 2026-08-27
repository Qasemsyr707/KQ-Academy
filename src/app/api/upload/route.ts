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
    
    const base64Image = buffer.toString('base64');
    const imgbbKey = process.env.IMGBB_API_KEY || '1f5ef4eb09ba47797cfb3d6f169c31b2';
    
    const imgbbFormData = new URLSearchParams();
    imgbbFormData.append('key', imgbbKey);
    imgbbFormData.append('image', base64Image);
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
      throw new Error('فشل الرفع إلى خدمة الصور السحابية');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'فشل الرفع إلى خدمة الصور السحابية');
    }

    return NextResponse.json({ url: data.data.url, filename: data.data.title }, { status: 201 });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الرفع' }, { status: 500 });
  }
}
