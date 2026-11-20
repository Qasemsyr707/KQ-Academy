/** Stable keys shared by the database, server guards and Arabic controls. */
export const PERMISSIONS = {
  DASHBOARD: 'الوصول إلى لوحة الإدارة',
  USERS: 'إدارة المستخدمين',
  USER_BANNING: 'حظر المستخدمين',
  COURSES: 'إدارة الكورسات',
  COURSE_PUBLISHING: 'نشر الكورسات',
  PAYMENTS: 'اعتماد المدفوعات',
  WALLETS: 'معاملات المحافظ',
  CERTIFICATES: 'إدارة الشهادات',
  LIVE_CLASSES: 'البث المباشر',
  MODERATION: 'الإشراف على المحتوى',
  SETTINGS: 'إعدادات المنصة',
  ADMINISTRATORS: 'إدارة المدراء',
} as const;
export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];
export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && Object.hasOwn(PERMISSIONS, value);
}
