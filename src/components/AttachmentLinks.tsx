import { Download, FileText } from 'lucide-react';
import { attachmentFileUrl, attachmentRequiresReupload } from '@/lib/attachment-links';

export type LinkedAttachment = {
  id: string;
  name: string;
  url?: string | null;
  requiresReupload?: boolean;
};

/** Native navigation keeps PDF rendering and downloading out of browser JS memory. */
export function AttachmentLinks({ attachment }: { attachment: LinkedAttachment }) {
  const requiresReupload = attachment.requiresReupload === true
    || (typeof attachment.url === 'string' && attachmentRequiresReupload(attachment.url));
  return (
    <div style={{ boxSizing: 'border-box', minWidth: 0, width: '100%', padding: '0.65rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowWrap: 'anywhere' }}>
        <FileText size={16} aria-hidden="true" /> {attachment.name}
      </span>
      {requiresReupload ? (
        <p role="status" style={{ color: '#fbbf24', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
          الملف الأصلي غير متوفر. يجب على المدرّب إعادة رفع الملف الأصلي؛ رابط الصورة أو تغيير امتداده لا يستعيد صفحات PDF.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
          <a href={attachmentFileUrl(attachment.id)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: 'var(--primary)', textDecoration: 'none' }} aria-label={`فتح ${attachment.name}`}>
            فتح الملف
          </a>
          <a href={attachmentFileUrl(attachment.id, true)} download style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', gap: '0.3rem', color: 'var(--primary)', textDecoration: 'none' }} aria-label={`تحميل ${attachment.name}`}>
            <Download size={14} aria-hidden="true" /> تحميل الملف
          </a>
        </div>
      )}
    </div>
  );
}
