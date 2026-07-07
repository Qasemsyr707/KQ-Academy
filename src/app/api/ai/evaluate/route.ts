import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { question, answer } = await req.json();
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        score: 85,
        feedback: "هذا التقييم هو تقييم افتراضي نظراً لعدم توفر مفتاح Gemini API. إجابتك تبدو جيدة!",
        tips: ["حاول استخدام أمثلة عملية أكثر.", "تحدث بثقة أكبر."]
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are an expert technical interviewer. 
    Evaluate the following answer to the interview question.
    Question: ${question}
    Answer: ${answer}
    
    Return a JSON response ONLY (no markdown) with the following structure:
    {
      "score": <number 0-100>,
      "feedback": "<string: brief feedback in Arabic>",
      "tips": ["<string: tip 1 in Arabic>", "<string: tip 2 in Arabic>"]
    }`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    const evaluation = JSON.parse(responseText);

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('AI Evaluate Error:', error);
    return NextResponse.json({ 
      score: 70,
      feedback: "حدث خطأ أثناء تقييم إجابتك.",
      tips: ["حاول مرة أخرى لاحقاً."]
    });
  }
}
