import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import PermissionsClient from './PermissionsClient';
import { PERMISSIONS, isPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export default async function PermissionsPage() {
  await requireRolePage(['OWNER']);
  const [admins, logs] = await Promise.all([
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, name: true, email: true, isBanned: true, adminPermissions: true }, orderBy: { name: 'asc' } }),
    prisma.permissionAuditLog.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }),
  ]);
  const identities = await prisma.user.findMany({ where: { id: { in: [...new Set(logs.flatMap(log => [log.actorId, log.targetId]))] } }, select: { id: true, name: true } });
  const names = new Map(identities.map(user => [user.id, user.name]));
  return <main dir="rtl" style={{ maxWidth: 1200, margin: 'auto', padding: '2rem 1rem' }}>
    <Link href="/admin">العودة إلى الإدارة</Link>
    <h1>إدارة صلاحيات المدراء</h1>
    <p>تُحفظ التغييرات فوراً. المدير الجديد لا يملك أي إذن حتى يمنحه المالك. حساب المالك محمي.</p>
    <PermissionsClient admins={admins} />
    <h2>سجل تغييرات الأذونات — آخر ١٠٠ تغيير</h2>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'right' }}>
      <thead><tr><th>المنفّذ</th><th>الحساب</th><th>الإجراء</th><th>الإذن</th><th>الوقت (عمّان)</th></tr></thead>
      <tbody>{logs.map(log => <tr key={log.id}>
        <td>{names.get(log.actorId) || log.actorId}</td><td>{names.get(log.targetId) || log.targetId}</td>
        <td>{log.action === 'REVOKE' ? 'سحب' : log.action === 'MIGRATION_GRANT' ? 'منح انتقالي' : 'منح'}</td>
        <td>{isPermission(log.permission) ? PERMISSIONS[log.permission] : log.permission}</td>
        <td><time dateTime={log.createdAt.toISOString()}>{log.createdAt.toLocaleString('ar-JO', { timeZone: 'Asia/Amman' })}</time></td>
      </tr>)}</tbody>
    </table></div>
    {!logs.length && <p>لا توجد تغييرات مسجّلة بعد.</p>}
  </main>;
}
