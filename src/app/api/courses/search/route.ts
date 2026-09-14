import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const type = searchParams.get('type') || '';
    const price = searchParams.get('price') || '';
    const rating = searchParams.get('rating') || '';
    const instructor = searchParams.get('instructor') || '';
    const sort = searchParams.get('sort') || 'newest';

    const where: any = {
      status: 'PUBLISHED'
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { instructor: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    if (category && category !== 'الكل') {
      where.category = category;
    }

    if (type && type !== 'الكل') {
      where.type = type;
    }

    if (instructor && instructor !== 'الكل') {
      where.instructor = { name: instructor };
    }

    if (price === 'free') {
      where.AND = [
        ...(where.AND || []),
        { price: 0 },
        { priceSYP: 0 }
      ];
    } else if (price === 'paid') {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { price: { gt: 0 } },
            { priceSYP: { gt: 0 } }
          ]
        }
      ];
    }

    if (rating) {
      const ratingValue = parseFloat(rating);
      if (!isNaN(ratingValue)) {
        where.rating = { gte: ratingValue };
      }
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'rating') {
      orderBy = { rating: 'desc' };
    } else if (sort === 'price_asc') {
      orderBy = { priceSYP: 'asc' };
    } else if (sort === 'price_desc') {
      orderBy = { priceSYP: 'desc' };
    } else if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        instructor: {
          select: { name: true, image: true }
        },
        _count: {
          select: { enrollments: true, reviews: true }
        }
      },
      orderBy
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء البحث' }, { status: 500 });
  }
}
