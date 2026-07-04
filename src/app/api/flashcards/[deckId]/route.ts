import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ deckId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    const { deckId } = await params;

    const deck = await (prisma as any).flashcardDeck.findUnique({
      where: { id: deckId },
      include: {
        flashcards: true
      }
    });

    if (!deck) {
      return NextResponse.json({ error: 'لم يتم العثور على الحزمة' }, { status: 404 });
    }

    if (deck.userId !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    return NextResponse.json({ deck, flashcards: deck.flashcards });
  } catch (error) {
    console.error('Error fetching deck:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ deckId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { deckId } = await params;
    const { front, back } = await request.json();

    if (!front || !back) {
      return NextResponse.json({ error: 'الوجه والظهر مطلوبان' }, { status: 400 });
    }

    // Verify deck ownership
    const deck = await (prisma as any).flashcardDeck.findUnique({
      where: { id: deckId }
    });

    if (!deck || deck.userId !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const flashcard = await (prisma as any).flashcard.create({
      data: {
        front,
        back,
        deckId
      }
    });

    return NextResponse.json({ flashcard });
  } catch (error) {
    console.error('Error creating flashcard:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ deckId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { deckId } = await params;

    const deck = await (prisma as any).flashcardDeck.findUnique({
      where: { id: deckId }
    });

    if (!deck || deck.userId !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    await (prisma as any).flashcardDeck.delete({
      where: { id: deckId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deck:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
