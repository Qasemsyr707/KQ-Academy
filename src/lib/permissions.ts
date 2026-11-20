/** Stable keys shared by the database, server guards and Arabic controls. */
export const PERMISSIONS = {
  DASHBOARD: 'الوصول إلى لوحة الإدارة',
  USERS: 'إدارة المستخدمين والحسابات',
  USER_BANNING: 'حظر المستخدمين',
  INSTRUCTORS: 'تعيين المدربين',
  COURSES: 'إنشاء الكورسات وتعديلها',
  COURSE_PUBLISHING: 'اعتماد الكورسات وطلبات التعديل',
  PAYMENTS: 'المدفوعات والاسترداد',
  WALLETS: 'المحافظ والأرصدة',
  CERTIFICATES: 'إدارة الشهادات',
  NOTIFICATIONS: 'الإشعارات والرسائل',
  LIVE_CLASSES: 'البث المباشر',
  MODERATION: 'الإشراف على المحتوى',
  MARKETING: 'التسويق والنمو',
  SETTINGS: 'إعدادات المنصة',
  ADMINISTRATORS: 'إدارة المدراء',
} as const;
export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];
export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && Object.hasOwn(PERMISSIONS, value);
}

/** Ready-made groups the owner can apply in one step; each still lists its permissions explicitly. */
export const PERMISSION_PRESETS: Record<string, { label: string; permissions: Permission[] }> = {
  NONE: { label: 'بدون صلاحيات', permissions: [] },
  CONTENT: { label: 'مشرف محتوى', permissions: ['DASHBOARD', 'COURSES', 'COURSE_PUBLISHING', 'MODERATION', 'CERTIFICATES', 'LIVE_CLASSES'] },
  FINANCE: { label: 'مسؤول مالي', permissions: ['DASHBOARD', 'PAYMENTS', 'WALLETS'] },
  SUPPORT: { label: 'دعم المستخدمين', permissions: ['DASHBOARD', 'USERS', 'USER_BANNING', 'NOTIFICATIONS'] },
  MARKETING: { label: 'تسويق', permissions: ['DASHBOARD', 'MARKETING', 'NOTIFICATIONS'] },
  FULL: { label: 'كل الصلاحيات', permissions: Object.keys(PERMISSIONS) as Permission[] },
};
