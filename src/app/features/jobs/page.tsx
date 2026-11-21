import FeatureUnavailable from '@/components/ui/FeatureUnavailable';

export const metadata = { title: 'فرص العمل | KQ Academy' };

/** No job listings are published yet: nothing is shown as a real vacancy or company. */
export default function JobsPage() {
  return <FeatureUnavailable
    title="فرص العمل"
    description="لا توجد فرص عمل منشورة على المنصة حالياً. عند نشر فرص حقيقية من الأكاديمية أو شركائها ستظهر هنا مع طريقة التقديم الرسمية."
    alternatives={[{ href: '/features/resume', label: 'جهّز سيرتك الذاتية' }, { href: '/courses', label: 'طوّر مهاراتك' }]}
  />;
}
