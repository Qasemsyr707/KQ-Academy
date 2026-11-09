import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

function settingError(error: unknown) {
  if (error instanceof RequestUserError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'بيانات الإعداد غير صالحة' }, { status: 400, headers: privateHeaders });
  }
  return NextResponse.json({ error: 'تعذّر إتمام طلب الإعدادات' }, { status: 500, headers: privateHeaders });
}

// GET all settings
export async function GET(req: Request) {
  try {
    await requireRequestUser(req, ['ADMIN', 'OWNER']);
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = Object.fromEntries(settings.map(setting => [setting.key, setting.value]));
    // Preserve the display default without writing to the database on GET.
    if (!settingsMap.exchangeRate) settingsMap.exchangeRate = '14500';
    return NextResponse.json(settingsMap, { headers: privateHeaders });
  } catch (error) {
    return settingError(error);
  }
}

// UPDATE a setting
export async function POST(req: Request) {
  try {
    await requireRequestUser(req, ['ADMIN', 'OWNER']);
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'بيانات الإعداد غير صالحة' }, { status: 400, headers: privateHeaders });
    }
    const { key, value } = body as Record<string, unknown>;
    if (typeof key !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(key)
      || !['string', 'number', 'boolean'].includes(typeof value)
      || (typeof value === 'number' && !Number.isFinite(value)) || String(value).length > 4096
      || (key === 'exchangeRate' && ((typeof value !== 'string' && typeof value !== 'number')
        || !Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > Number.MAX_SAFE_INTEGER))
      || (key.startsWith('ENABLE_') && value !== true && value !== false && value !== 'true' && value !== 'false')) {
      return NextResponse.json({ error: 'يرجى إدخال اسم وقيمة صالحين للإعداد' }, { status: 400, headers: privateHeaders });
    }
    
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });

    return NextResponse.json(setting, { headers: privateHeaders });
  } catch (error) {
    return settingError(error);
  }
}
