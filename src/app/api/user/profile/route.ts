import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 401 });
    }

    const { name, phone, image } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(image !== undefined && { image }),
      },
    });

    return NextResponse.json({ 
      message: 'تم تحديث الملف الشخصي بنجاح', 
      user: {
        name: updatedUser.name,
        phone: updatedUser.phone,
        image: updatedUser.image,
      } 
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث البيانات' }, { status: 500 });
  }
}
