import { prisma } from '@/lib/db'
import CoursesClient from './CoursesClient'

export const dynamic = 'force-dynamic'

export default async function CoursesPage() {
  // Fetch courses from the real SQLite database
  const dbCourses = await prisma.course.findMany({
    include: {
      instructor: true
    }
  })

  // Hardcoded courses as fallback/placeholder if DB is empty
  const mockCourses = [
    {
      id: 'mock1',
      title: 'تطوير الويب الشامل (React & Next.js)',
      instructor: 'أ. خالد',
      rating: 4.9,
      students: 2090,
      duration: '45 ساعة',
      price: 50000,
      category: 'برمجة وتطوير',
      image: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
      featured: true
    },
    {
      id: 'mock2',
      title: 'ماجستير مصغر في الذكاء الاصطناعي',
      instructor: 'م. يوسف طارق',
      rating: 4.8,
      students: 850,
      duration: '32 ساعة',
      price: 75000,
      category: 'ذكاء اصطناعي',
      image: 'linear-gradient(135deg, #4c1d95 0%, #0f172a 100%)',
      featured: false
    }
  ];

  const allCourses = [...dbCourses, ...mockCourses]

  return <CoursesClient initialCourses={allCourses} />
}
