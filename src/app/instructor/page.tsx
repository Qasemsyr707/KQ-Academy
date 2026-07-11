import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import InstructorDashboardClient from './InstructorDashboardClient';

export const dynamic = 'force-dynamic';

export default async function InstructorDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }
  
  if (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const instructorId = session.user.id;
  const firstName = session.user.name?.split(' ')[0] || 'أستاذنا العزيز';

  // Fetch Instructor's Courses with relation counts
  const courses = await prisma.course.findMany({
    where: { instructorId },
    include: {
      _count: {
        select: { enrollments: true }
      },
      payments: {
        where: { status: 'APPROVED' },
        select: { amount: true }
      }
    }
  });

  let totalStudents = 0;
  let totalRevenue = 0;
  let averageRating = 0;
  let activeCourses = [];

  for (const course of courses) {
    totalStudents += course._count.enrollments;
    
    const courseRevenue = course.payments.reduce((sum, p) => sum + p.amount, 0);
    totalRevenue += courseRevenue;
    
    activeCourses.push({
      id: course.id,
      title: course.title,
      students: course._count.enrollments,
      rating: course.rating,
      revenue: courseRevenue
    });
  }

  if (courses.length > 0) {
    averageRating = courses.reduce((sum, course) => sum + course.rating, 0) / courses.length;
  }

  // Fetch recent payments for revenue chart (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentPayments = await prisma.payment.findMany({
    where: {
      status: 'APPROVED',
      course: { instructorId },
      createdAt: { gte: sixMonthsAgo }
    },
    select: {
      amount: true,
      createdAt: true
    }
  });

  // Group payments by month (e.g. "Jan", "Feb")
  const monthlyRevenue: Record<string, number> = {};
  
  // Initialize last 6 months with 0
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toLocaleString('ar-EG', { month: 'short' });
    monthlyRevenue[monthStr] = 0;
  }

  for (const payment of recentPayments) {
    const monthStr = new Date(payment.createdAt).toLocaleString('ar-EG', { month: 'short' });
    if (monthlyRevenue[monthStr] !== undefined) {
      monthlyRevenue[monthStr] += payment.amount;
    }
  }

  const revenueData = Object.keys(monthlyRevenue).map(month => ({
    month,
    revenue: monthlyRevenue[month]
  }));

  return (
    <InstructorDashboardClient 
      firstName={firstName}
      totalStudents={totalStudents}
      averageRating={averageRating}
      totalRevenue={totalRevenue}
      activeCourses={activeCourses}
      revenueData={revenueData}
    />
  );
}
