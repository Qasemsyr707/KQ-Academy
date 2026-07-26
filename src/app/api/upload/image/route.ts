import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرفاق أي صورة' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create public/uploads/thumbnails directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate a unique filename
    const ext = file.name.split('.').pop() || 'png';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Write file to disk
    fs.writeFileSync(filePath, buffer);

    // The public URL to access the image
    const publicUrl = `/uploads/thumbnails/${filename}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Image Upload Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء رفع الصورة' }, { status: 500 });
  }
}
