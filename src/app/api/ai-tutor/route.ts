import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return a valid JSON placeholder if API key is missing so the app doesn't crash, but inform the user.
      console.warn("GEMINI_API_KEY is not set in environment variables!");
      
      if (message.includes('JSON')) {
        return NextResponse.json({ 
          reply: `\`\`\`json
[
  {
    "text": "يرجى إضافة مفتاح GEMINI_API_KEY إلى إعدادات Vercel لتفعيل الذكاء الاصطناعي الحقيقي. هذا سؤال تجريبي.",
    "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
    "correctAnswer": 0,
    "points": 1
  }
]
\`\`\``
        });
      }

      return NextResponse.json({ reply: "عذراً، مفتاح GEMINI_API_KEY غير متوفر في إعدادات النظام. يرجى إضافته ليعمل المساعد الذكي." });
    }

    // Call Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: message }]
        }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch from Gemini API' }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتمكن الذكاء الاصطناعي من معالجة الطلب.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI Tutor API Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
