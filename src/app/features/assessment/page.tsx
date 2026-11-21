import FeatureUnavailable from '@/components/ui/FeatureUnavailable';

export const metadata = { title: 'تقييم المستوى | KQ Academy' };

/** No fixed, fabricated evaluation: practice uses the real exam simulator, graded on the server. */
export default function AssessmentPage() {
  return <FeatureUnavailable
    title="تقييم المستوى"
    description="اختبار تحديد المستوى غير متاح بعد. يمكنك قياس مستواك الآن عبر محاكي الامتحانات، الذي يستخدم أسئلة حقيقية من كورساتك ويُصحَّح على الخادم."
    alternatives={[{ href: '/features/exam', label: 'محاكي الامتحانات' }]}
  />;
}
