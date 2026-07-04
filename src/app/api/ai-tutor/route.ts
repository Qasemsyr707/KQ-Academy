import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    
    // Simulate AI delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    let reply = "مرحباً! أنا المساعد الذكي الخاص بك. كيف يمكنني مساعدتك في رحلتك التعليمية اليوم؟";
    
    if (message.includes('رياضيات') || message.includes('حساب')) {
      reply = "الرياضيات مادة رائعة! بناءً على تقييمك الأخير، أقترح مراجعة درس 'التفاضل والتكامل' لأنك واجهت بعض الصعوبة فيه. هل نبدأ الآن؟";
    } else if (message.includes('خطة') || message.includes('مسار')) {
      reply = "لقد قمت بتحليل سرعة تعلمك. مسارك المخصص الجديد يركز على الدروس التفاعلية القصيرة لزيادة الاستيعاب. لقد أضفت 3 دروس جديدة إلى قائمتك.";
    } else if (message.includes('صعب')) {
      reply = "لا تقلق! لقد قمت بتعديل مستوى الصعوبة لك في الاختبار القادم ليناسب مستواك الحالي. التدريب المستمر هو مفتاح النجاح.";
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
