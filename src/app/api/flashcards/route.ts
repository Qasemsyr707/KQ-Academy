import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const decks = await (prisma as any).flashcardDeck.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { flashcards: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ decks });
  } catch (error) {
    console.error('Error fetching flashcard decks:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'عنوان الحزمة مطلوب' }, { status: 400 });
    }

    const deck = await (prisma as any).flashcardDeck.create({
      data: {
        title,
        userId: user.id
      }
    });

    return NextResponse.json({ deck });
  } catch (error) {
    console.error('Error creating flashcard deck:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
