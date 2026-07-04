import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireRoleApi } from '@/lib/rbac';

// GET all settings
export async function GET(req: Request) {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });
    
    // Default exchange rate if not set
    if (!settingsMap['exchangeRate']) {
      const defaultRate = await prisma.setting.create({
        data: { key: 'exchangeRate', value: '14500' }
      });
      settingsMap['exchangeRate'] = defaultRate.value;
    }
    
    return NextResponse.json(settingsMap);
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// UPDATE a setting
export async function POST(req: Request) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const { key, value } = await req.json();
    
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
