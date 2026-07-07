import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secure-super-secret-key-for-video-streaming';

export async function POST(req: Request) {
  try {
    const { lessonId } = await req.json();

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    // Generate a short-lived token (e.g., 5 minutes)
    const token = jwt.sign(
      { lessonId, purpose: 'video_stream' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    // In a real application, this would be a pre-signed URL to S3 or a CDN.
    // Here we generate a mock signed URL that points back to our server or a mock CDN.
    // For demonstration, we'll return a URL with the token attached.
    const signedUrl = `https://www.w3schools.com/html/mov_bbb.mp4?token=${token}&expires=${Date.now() + 5 * 60 * 1000}`;

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    console.error('Error generating secure stream:', error);
    return NextResponse.json({ error: 'Failed to generate secure stream URL' }, { status: 500 });
  }
}
