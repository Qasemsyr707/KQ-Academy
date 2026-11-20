import { COURSE_CONTENT_FIELDS } from './course-update';

/** Client-safe field list and Arabic labels for course change requests. */
export const CHANGE_REQUEST_FIELDS = [...COURSE_CONTENT_FIELDS, 'price', 'priceSYP'] as const;
export type ChangeField = typeof CHANGE_REQUEST_FIELDS[number];

export const FIELD_LABELS: Record<ChangeField, string> = {
  title: 'العنوان', description: 'الوصف', thumbnail: 'صورة الغلاف', previewVideoUrl: 'فيديو المقدمة',
  includes: 'ما يتضمنه الكورس', category: 'التصنيف', price: 'السعر بالدولار', priceSYP: 'السعر بالليرة السورية',
};
