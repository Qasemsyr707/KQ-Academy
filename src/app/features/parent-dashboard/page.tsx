import FeatureUnavailable from '@/components/ui/FeatureUnavailable';

export const metadata = { title: 'لوحة ولي الأمر | KQ Academy' };

export default function ParentDashboardPage() {
  return <FeatureUnavailable
    title="لوحة ولي الأمر"
    description="ربط حساب ولي الأمر بحساب الطالب غير متاح بعد. يمكن للطالب حالياً متابعة تقدمه وشهاداته من لوحته الخاصة."
    alternatives={[{ href: '/dashboard', label: 'لوحة الطالب' }]}
  />;
}
