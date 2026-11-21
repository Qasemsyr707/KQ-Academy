import FeatureUnavailable from '@/components/ui/FeatureUnavailable';

export const metadata = { title: 'المشاهدة دون اتصال | KQ Academy' };

export default function OfflinePage() {
  return <FeatureUnavailable
    title="المشاهدة دون اتصال"
    description="تنزيل الدروس لمشاهدتها دون إنترنت غير متاح حالياً. الدروس تُشاهد عبر المشغّل الآمن داخل المنصة، والمرفقات المسموح بها تُنزَّل من صفحة الدرس."
    alternatives={[{ href: '/courses', label: 'كورساتي' }]}
  />;
}
