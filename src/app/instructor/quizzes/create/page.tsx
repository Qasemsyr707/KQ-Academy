import { redirect } from 'next/navigation';

/** Old link ("اختبار بملف"): file quizzes are created inside the quiz manager. */
export default function CreateQuizPage() {
  redirect('/instructor/quizzes?new=file');
}
