import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const decks = await prisma.flashcardDeck.findMany({
      include: { flashcards: true }
    });
    return NextResponse.json(decks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch flashcards' }, { status: 500 });
  }
}
