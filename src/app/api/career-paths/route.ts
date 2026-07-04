import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    let userId = null;
    if (session?.user) {
      userId = (session.user as any).id;
    }

    const paths = await prisma.careerPath.findMany({
      include: {
        courses: {
          orderBy: { order: 'asc' },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnail: true,
                price: true,
                rating: true,
              }
            }
          }
        }
      }
    });

    if (paths.length === 0) {
      // Fallback mock data if DB is empty
      const mockPaths = [
        {
          id: 'path1',
          title: 'مسار مطور الويب الشامل (Full Stack)',
          description: 'تعلم بناء تطبيقات الويب من الصفر حتى الاحتراف باستخدام أحدث التقنيات.',
          icon: 'Code',
          courses: [
            { order: 1, course: { id: 'c1', title: 'أساسيات HTML & CSS', description: 'ابدأ رحلتك في عالم الويب.', thumbnail: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=300' } },
            { order: 2, course: { id: 'c2', title: 'برمجة JavaScript', description: 'لغة الويب التفاعلية.', thumbnail: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&q=80&w=300' } },
            { order: 3, course: { id: 'c3', title: 'React.js المتقدم', description: 'بناء واجهات المستخدم الحديثة.', thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=300' } },
            { order: 4, course: { id: 'c4', title: 'Node.js & Databases', description: 'برمجة الخوادم وقواعد البيانات.', thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=300' } },
          ]
        },
        {
          id: 'path2',
          title: 'مسار التسويق الرقمي (Digital Marketing)',
          description: 'احترف التسويق عبر منصات التواصل الاجتماعي ومحركات البحث.',
          icon: 'TrendingUp',
          courses: [
            { order: 1, course: { id: 'c5', title: 'مقدمة في التسويق الرقمي', description: 'مفاهيم أساسية.', thumbnail: 'https://images.unsplash.com/photo-1432888117246-cd537f1159c0?auto=format&fit=crop&q=80&w=300' } },
            { order: 2, course: { id: 'c6', title: 'إعلانات السوشيال ميديا', description: 'Facebook, Instagram, TikTok.', thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=300' } },
            { order: 3, course: { id: 'c7', title: 'تحسين محركات البحث SEO', description: 'تصدر نتائج جوجل.', thumbnail: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?auto=format&fit=crop&q=80&w=300' } },
          ]
        }
      ];
      return NextResponse.json(mockPaths);
    }

    return NextResponse.json(paths);
  } catch (error: any) {
    console.error('Error fetching career paths:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
