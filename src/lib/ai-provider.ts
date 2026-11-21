import { consume, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

/**
 * Google Gemini, called from the server only (the key never reaches the browser).
 * The model is configurable (GEMINI_MODEL); the default is a current, supported model.
 * Nothing is simulated: without a key, or when the provider fails, the caller gets an honest error.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const AI_RULE = { name: 'ai', burst: 10, perMinute: 6 } as const;

export class AiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function aiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured && /^[a-z0-9.-]{3,60}$/i.test(configured) ? configured : DEFAULT_GEMINI_MODEL;
}

/** Per-user limit so the platform key cannot be drained by one account. */
export function limitAi(userId: string) {
  const result = consume(AI_RULE, userId);
  if (!result.allowed) throw new AiError(429, RATE_LIMIT_MESSAGE);
}

type Turn = { role: 'user' | 'model'; text: string };

export async function generate(turns: Turn[], options: { system?: string; maxOutputTokens?: number; temperature?: number } = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError(503, 'المساعد الذكي غير مفعّل حالياً على المنصة (لم يُضبط مفتاح الخدمة).');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiModel())}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
      contents: turns.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
      generationConfig: { maxOutputTokens: options.maxOutputTokens ?? 2000, temperature: options.temperature ?? 0.7 },
    }),
  }).catch(() => null);
  if (!response) throw new AiError(503, 'تعذّر الوصول إلى خدمة الذكاء الاصطناعي، حاول بعد قليل.');
  if (!response.ok) {
    console.error('[ai] provider error', response.status);
    throw new AiError(503, response.status === 429 ? 'خدمة الذكاء الاصطناعي مشغولة حالياً، حاول بعد قليل.' : 'تعذّرت معالجة الطلب لدى خدمة الذكاء الاصطناعي.');
  }
  const data = await response.json().catch(() => null) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim();
  if (!text) throw new AiError(502, 'لم تُرجع خدمة الذكاء الاصطناعي إجابة.');
  return text;
}
