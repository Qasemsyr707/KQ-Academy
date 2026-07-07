import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const title = formData.get('title') as string;
    const instructorId = formData.get('instructorId') as string;

    if (!file || !title || !instructorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In a real production app, we upload `file` to AWS S3 or Cloudflare R2 here
    // For this prototype, we simulate a successful upload and return a mock URL
    const mockVideoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
    
    // Create the course record in Prisma
    const newCourse = await prisma.course.create({
      data: {
        title: title,
        category: 'عام',
        instructorId: instructorId,
        thumbnail: 'https://via.placeholder.com/600x400?text=Course+Thumbnail',
        price: 50,
        priceSYP: 750000,
        chapters: {
          create: {
            title: 'الفصل الأول',
            order: 1,
            lessons: {
              create: {
                title: 'مقدمة الدورة',
                videoUrl: mockVideoUrl,
                order: 1,
                isLive: false
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, courseId: newCourse.id, videoUrl: mockVideoUrl });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}
