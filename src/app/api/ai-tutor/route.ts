import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { AiError, generate, limitAi } from '@/lib/ai-provider';

const headers = { 'Cache-Control': 'private, no-store' };

/**
 * Single-prompt generation used by instructors (e.g. drafting quiz questions).
 * Signed-in instructors and staff only, rate limited; it never returns placeholder content.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'COURSES');
    limitAi(user.id);
    const body = await request.json().catch(() => null) as { message?: unknown } | null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 8000) return NextResponse.json({ error: 'الطلب فارغ أو طويل جداً' }, { status: 400, headers });
    const reply = await generate([{ role: 'user', text: message }], { maxOutputTokens: 4000 });
    return NextResponse.json({ reply }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof AiError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('AI Tutor API Error:', error);
    return NextResponse.json({ error: 'تعذّرت معالجة الطلب' }, { status: 500, headers });
  }
}
