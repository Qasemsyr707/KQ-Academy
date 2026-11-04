import { PDFDocument } from 'pdf-lib';

export class DocumentValidationError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export const DOCUMENT_EXTENSIONS = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv|zip|rar)$/i;
const TYPES: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', csv: 'text/csv', zip: 'application/zip', rar: 'application/vnd.rar',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
};

export function looksLikePdf(bytes: Uint8Array) {
  return bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString('ascii') === '%PDF-';
}

/** Validate every original byte; never re-save, rasterize, or regenerate a PDF. */
export async function validatePdfBytes(bytes: Uint8Array): Promise<void> {
  if (!looksLikePdf(bytes)) throw new DocumentValidationError(415, 'الملف ليس PDF حقيقياً؛ تغيير امتداد الصورة لا يحولها إلى PDF');
  const tail = Buffer.from(bytes.subarray(Math.max(0, bytes.length - 1024))).toString('latin1');
  if (!/%%EOF[\x00\x09\x0a\x0c\x0d\x20]*$/.test(tail)) throw new DocumentValidationError(422, 'ملف PDF مبتور أو غير مكتمل');
  try {
    const document = await PDFDocument.load(bytes, { throwOnInvalidObject: true, ignoreEncryption: false, updateMetadata: false });
    if (document.isEncrypted || document.context.trailerInfo.Encrypt) throw new Error('Encrypted PDF');
    if (document.getPageCount() < 1) throw new Error('No PDF pages');
    // Resolve page dictionaries too: a corrupt page tree must not pass metadata-only parsing.
    document.getPages().forEach(page => { page.getSize(); });
  } catch { throw new DocumentValidationError(422, 'ملف PDF تالف أو مشفر؛ ارفع نسخة PDF صالحة غير مشفرة'); }
}

export async function validateDocumentBytes(bytes: Buffer, name: string, declaredType: string): Promise<string> {
  const extension = name.split('.').pop()?.toLowerCase() || '';
  const declared = declaredType.split(';')[0].trim().toLowerCase();
  if (extension === 'pdf' || declared === 'application/pdf' || looksLikePdf(bytes)) {
    await validatePdfBytes(bytes);
    return 'application/pdf';
  }
  const mimeType = TYPES[extension] || Object.values(TYPES).find(type => type === declared);
  if (!mimeType || declared.startsWith('video/')) throw new DocumentValidationError(415, 'نوع المستند غير مدعوم');
  const generic = !declared || declared === 'application/octet-stream';
  const aliases: Record<string, string[]> = {
    'application/zip': ['application/x-zip-compressed'], 'application/vnd.rar': ['application/x-rar-compressed'],
    'audio/wav': ['audio/x-wav'], 'audio/mpeg': ['audio/mp3'],
  };
  if (!generic && declared !== mimeType && !aliases[mimeType]?.includes(declared)) throw new DocumentValidationError(415, 'نوع الملف لا يطابق امتداده');
  if (['docx', 'pptx', 'xlsx', 'zip'].includes(extension) && !bytes.subarray(0, 2).equals(Buffer.from('PK'))) throw new DocumentValidationError(415, 'محتوى المستند لا يطابق نوعه');
  if (['doc', 'ppt', 'xls'].includes(extension) && !bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'))) throw new DocumentValidationError(415, 'محتوى المستند لا يطابق نوعه');
  if (extension === 'rar' && !bytes.subarray(0, 4).equals(Buffer.from('52617221', 'hex'))) throw new DocumentValidationError(415, 'محتوى الأرشيف لا يطابق نوعه');
  return mimeType;
}
