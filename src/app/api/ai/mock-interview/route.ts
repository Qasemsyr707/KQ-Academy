import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { topic = 'General Software Engineering' } = await req.json();
    
    if (!process.env.GEMINI_API_KEY) {
      // Fallback if no key
      return NextResponse.json({ 
        questions: [
          `حدثنا عن خبرتك في مجال ${topic}؟`,
          `كيف تتعامل مع التحديات الصعبة في ${topic}؟`,
          `اذكر لنا مشروعاً تفخر به في هذا المجال؟`
        ] 
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Generate 3 professional interview questions for a candidate applying for a position in ${topic}. Return ONLY a JSON array of strings in Arabic. Do not include markdown formatting.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    const questions = JSON.parse(responseText);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('AI Mock Interview Error:', error);
    return NextResponse.json({ 
      questions: [
        "حدثنا عن نفسك وعن خبرتك؟",
        "كيف تقيس نجاح عملك؟",
        "اذكر لنا موقفاً واجهت فيه مشكلة صعبة، وكيف قمت بحلها؟"
      ] 
    });
  }
}
