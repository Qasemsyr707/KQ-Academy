import { randomBytes } from 'node:crypto';
import type { Certificate } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface CertificateViewer { id: string; role: string }

/**
 * `full`: an authenticated, active viewer owns/administers the certificate.
 * `limited`: public verification only, regardless of the reference format.
 * References locate records; they never grant document access.
 */
export type CertificateAccess = 'full' | 'limited';

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
const NUMBER = /^KQ\d{4}-\d{1,9}$/i;

export const newVerifyToken = () => randomBytes(16).toString('base64url');

export function canAccessCertificateDocument(certificate: { userId: string; course: { instructorId: string } }, viewer?: CertificateViewer | null): boolean {
  return !!viewer && (viewer.id === certificate.userId || ['ADMIN', 'OWNER'].includes(viewer.role)
    || (viewer.role === 'INSTRUCTOR' && viewer.id === certificate.course.instructorId));
}

export async function resolveCertificate(reference: unknown, viewer?: CertificateViewer | null):
  Promise<{ certificate: Certificate & { course: { instructorId: string; durationHours: number | null; createdAt: Date } }; access: CertificateAccess } | null> {
  if (typeof reference !== 'string' || !reference || reference.length > 64) return null;
  const include = { course: { select: { instructorId: true, durationHours: true, createdAt: true } } } as const;

  if (NUMBER.test(reference)) {
    const certificate = await prisma.certificate.findUnique({ where: { certificateNumber: reference.toUpperCase() }, include });
    if (!certificate) return null;
    const trusted = canAccessCertificateDocument(certificate, viewer);
    return { certificate, access: trusted ? 'full' : 'limited' };
  }
  if (!TOKEN.test(reference)) return null;
  const certificate = await prisma.certificate.findFirst({
    where: { OR: [{ verifyToken: reference }, { id: reference }] }, include,
  });
  return certificate ? { certificate, access: canAccessCertificateDocument(certificate, viewer) ? 'full' : 'limited' } : null;
}

/**
 * The public reference for links and QR codes. Certificates issued before
 * verification tokens existed are never rewritten: their own non-sequential
 * record id serves as the reference, so historical records stay untouched.
 */
export function publicReference(certificate: Pick<Certificate, 'id' | 'verifyToken'>): string {
  return certificate.verifyToken || certificate.id;
}

/**
 * Issued by the original system (template 1.0). Re-generated copies keep their
 * original artwork and issue data, drawn legibly.
 */
export function isLegacyCertificate(certificate: Pick<Certificate, 'templateVersion'>): boolean {
  return certificate.templateVersion === '1.0';
}

/** "محمد عبد الرحمن" -> "م••• ع••• ا•••": enough to recognise, not to harvest. */
export function maskName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).map(word => `${[...word][0]}•••`).join(' ');
}

/**
 * Hours to print, or null to print nothing. Certificates issued before course
 * durations existed all carry the old hard-coded default (16), which was never
 * a real value, so for them only the course's own duration counts.
 */
export function certificateHours(certificate: Pick<Certificate, 'courseDuration' | 'templateVersion'>, course: { durationHours: number | null }): number | null {
  const stored = certificate.templateVersion === '1.0' ? null : certificate.courseDuration;
  const hours = stored && stored > 0 ? stored : course.durationHours;
  return typeof hours === 'number' && Number.isFinite(hours) && hours > 0 ? Math.round(hours * 10) / 10 : null;
}

const utcDay = (value: Date) => new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' });

/**
 * The dates printed on a certificate, taken from stored facts only:
 * - issue date: the certificate's own issuedAt;
 * - course period: from the student's recorded enrollment to the issue date,
 *   shown only when that enrollment exists and is not later than the issue date.
 * When the start is unknown nothing is invented: the period reads
 * "Completed by <issue date>". The course's creation date (it changes when a
 * course is re-created or restored) and the current date are never used.
 */
export function certificateDates(issuedAt: Date, enrolledAt?: Date | null): { courseDate: string; issueDate: string } {
  const issueDate = utcDay(issuedAt);
  const start = enrolledAt && new Date(enrolledAt).getTime() <= new Date(issuedAt).getTime() ? utcDay(enrolledAt) : null;
  return { issueDate, courseDate: start ? `${start} - ${issueDate}` : `Completed by ${issueDate}` };
}

export const certificateUrls = (reference: string) => ({
  verify: `/verify/${reference}`,
  png: `/api/certificates/${reference}/png`,
  pdf: `/api/certificates/${reference}/pdf`,
});
