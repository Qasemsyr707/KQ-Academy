import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// We initialize the Gemini API. If the key is not set, we'll gracefully handle it below.
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (!apiKey) {
      return NextResponse.json({ 
        reply: 'مرحباً بك! لكي أعمل بشكل صحيح، يجب على مدير النظام إضافة مفتاح `GEMINI_API_KEY` في إعدادات البيئة (Vercel). أنا حالياً أعمل في وضع المحاكاة.' 
      }, { status: 200 });
    }

    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "أنت معلم ذكي وصبور في أكاديمية KQ Academy. مهمتك هي مساعدة الطلاب في فهم المواد الدراسية، وشرح الأكواد البرمجية، والمفاهيم العلمية بطريقة مبسطة ومشجعة باللغة العربية. استخدم التنسيق المناسب والأمثلة كلما أمكن."
    });

    // Format history for Gemini API (user -> user, assistant -> model)
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        maxOutputTokens: 2000,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ reply: text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة طلبك' }, { status: 500 });
  }
}
