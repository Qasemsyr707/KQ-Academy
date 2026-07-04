import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'غير مصرح لك بإجراء هذه العملية' }, { status: 401 });
    }

    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'عنوان الفيديو مطلوب' }, { status: 400 });
    }

    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: 'إعدادات Bunny.net غير متوفرة على الخادم' }, { status: 500 });
    }

    // Create a video object in Bunny Stream
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        AccessKey: apiKey
      },
      body: JSON.stringify({ title })
    };

    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, options);
    
    if (!response.ok) {
      const err = await response.text();
      console.error('Bunny API Error:', err);
      return NextResponse.json({ error: 'فشل في إنشاء الفيديو على الخادم الخارجي' }, { status: 500 });
    }

    const data = await response.json();

    // Return the video ID (guid) so the client can upload via Tus
    return NextResponse.json({ 
      success: true, 
      videoId: data.guid,
      libraryId: libraryId // Needed for Tus client
    }, { status: 200 });

  } catch (error) {
    console.error('Create Bunny Video API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
