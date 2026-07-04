import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Simulated AI responses based on keywords
const mockResponses: { keywords: string[], reply: string }[] = [
  {
    keywords: ['react', 'رياكت'],
    reply: `React هي مكتبة جافاسكربت لبناء واجهات المستخدم، تم تطويرها بواسطة Facebook. الميزة الأساسية فيها هي استخدام المكونات (Components) التي يمكن إعادة استخدامها. \n\nمثال بسيط لكتابة مكون React:\n\`\`\`javascript\nfunction HelloWorld() {\n  return <h1>مرحباً بك في أكاديمية K&Q!</h1>;\n}\n\`\`\``
  },
  {
    keywords: ['خطأ', 'مشكلة', 'error', 'bug'],
    reply: `يبدو أنك تواجه خطأً برمجياً. لا تقلق، هذا طبيعي جداً! \nحاول قراءة رسالة الخطأ في الـ Console بعناية، غالباً ما تخبرك بالسطر الذي يحتوي على المشكلة. هل يمكنك نسخ رسالة الخطأ لي لأساعدك بشكل أفضل؟`
  },
  {
    keywords: ['nextjs', 'نكست'],
    reply: `Next.js هو إطار عمل مبني فوق React. يمنحك ميزات إضافية قوية جداً مثل الرندرة في الخادم (SSR) وتوليد الصفحات الثابتة (SSG)، بالإضافة لنظام توجيه مبني على الملفات (App Router) الذي نستخدمه هنا في المنصة.`
  },
  {
    keywords: ['شكرا', 'يعطيك العافية', 'thanks'],
    reply: `على الرحب والسعة! أنا هنا دائماً لمساعدتك في رحلتك التعليمية. هل لديك أي استفسارات أخرى؟`
  }
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'يرجى تسجيل الدخول أولاً لاستخدام المساعد الذكي' }, { status: 401 });
    }

    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });
    }

    // Simulate network delay for "AI processing"
    await new Promise(resolve => setTimeout(resolve, 1500));

    const msgLower = message.toLowerCase();
    
    // Find matching mock response
    let reply = `سؤال ممتاز! هذا الموضوع يعتبر من الأساسيات المهمة في مسارك التعليمي. أنصحك بمراجعة درس "الأساسيات المتقدمة" في الكورس الخاص بك لفهم أعمق.\n\nوإذا كنت تبحث عن كود برمجي كبداية:\n\`\`\`javascript\n// مثال توضيحي\nconst learn = "Practice makes perfect!";\nconsole.log(learn);\n\`\`\``;

    for (const mock of mockResponses) {
      if (mock.keywords.some(kw => msgLower.includes(kw))) {
        reply = mock.reply;
        break;
      }
    }

    return NextResponse.json({ reply }, { status: 200 });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة رسالتك' }, { status: 500 });
  }
}
