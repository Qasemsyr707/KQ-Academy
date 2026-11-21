import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { AiError, generate, limitAi } from '@/lib/ai-provider';

const headers = { 'Cache-Control': 'private, no-store' };
const SYSTEM = 'أنت معلم ذكي وصبور في أكاديمية KQ Academy. مهمتك مساعدة الطلاب في فهم المواد الدراسية وشرح الأكواد والمفاهيم العلمية بطريقة مبسطة ومشجعة باللغة العربية، مع أمثلة عند الحاجة. إن لم تكن متأكداً من معلومة فقل ذلك بوضوح.';

/** The AI tutor for signed-in users. Real provider replies only; honest errors otherwise. */
export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    limitAi(user.id);
    const body = await req.json().catch(() => null) as { message?: unknown; history?: unknown } | null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 4000) return NextResponse.json({ error: 'اكتب سؤالك (4000 حرف كحد أقصى)' }, { status: 400, headers });
    // Last turns only, alternating user/model, starting with the user (the provider requires it).
    const turns: { role: 'user' | 'model'; text: string }[] = [];
    const history = Array.isArray(body?.history) ? body.history.slice(-20) : [];
    for (const raw of history) {
      const item = raw as { role?: unknown; content?: unknown };
      if (typeof item?.content !== 'string' || !item.content.trim()) continue;
      const role = item.role === 'user' ? 'user' : 'model';
      if (turns.length === 0 && role !== 'user') continue;
      if (turns.length && turns[turns.length - 1].role === role) continue;
      turns.push({ role, text: item.content.slice(0, 4000) });
    }
    if (turns.length && turns[turns.length - 1].role === 'user') turns.pop();
    turns.push({ role: 'user', text: message });
    const reply = await generate(turns, { system: SYSTEM });
    return NextResponse.json({ reply }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof AiError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('[ai chat]', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة طلبك' }, { status: 500, headers });
  }
}
