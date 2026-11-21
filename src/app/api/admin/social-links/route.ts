import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { isSocialPlatform, SocialLinkError, validateSocialUrl } from '@/lib/social-links';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
function fail(error: unknown) {
  if (error instanceof RequestUserError || error instanceof SocialLinkError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers });
  console.error('[admin social links]', error);
  return NextResponse.json({ error: 'تعذّر حفظ الرابط' }, { status: 500, headers });
}

/** OWNER, or an ADMIN with the MARKETING permission (checked in the database on every request). */
const manager = (req: Request) => requireRequestUser(req, ['ADMIN', 'OWNER'], 'MARKETING');

export async function GET(req: Request) {
  try {
    await manager(req);
    const links = await prisma.socialLink.findMany({ orderBy: [{ order: 'asc' }, { platform: 'asc' }] });
    return NextResponse.json({ links }, { headers });
  } catch (error) { return fail(error); }
}

/** Create or update one platform's link: { platform, url, isActive, order }. */
export async function PUT(req: Request) {
  try {
    const user = await manager(req);
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SocialLinkError(400, 'بيانات غير صالحة');
    const { platform, url, isActive, order } = body as Record<string, unknown>;
    if (!isSocialPlatform(platform)) throw new SocialLinkError(400, 'المنصة غير مدعومة');
    const safeUrl = validateSocialUrl(platform, url);
    const position = order === undefined ? 0 : Number(order);
    if (!Number.isInteger(position) || position < 0 || position > 100) throw new SocialLinkError(400, 'ترتيب العرض يجب أن يكون بين 0 و100');
    const data = { url: safeUrl, isActive: isActive !== false, order: position, updatedById: user.id };
    const link = await prisma.socialLink.upsert({ where: { platform }, create: { platform, ...data }, update: data });
    console.info('[admin social links] saved', { platform, by: user.id });
    return NextResponse.json({ link }, { headers });
  } catch (error) { return fail(error); }
}

export async function DELETE(req: Request) {
  try {
    const user = await manager(req);
    const platform = new URL(req.url).searchParams.get('platform');
    if (!isSocialPlatform(platform)) throw new SocialLinkError(400, 'المنصة غير مدعومة');
    await prisma.socialLink.deleteMany({ where: { platform } });
    console.info('[admin social links] removed', { platform, by: user.id });
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { return fail(error); }
}
