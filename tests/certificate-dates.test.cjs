/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// Dates printed on certificates come from stored facts only, are never
// inconsistent, never use the current date, and are laid out left-to-right.
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const access = loadTs('../src/lib/certificate-access.ts', { '@/lib/db': { prisma: { notification: {} } } });
const certificate = loadTs('../src/lib/certificate.ts');
const LRM = '‎';
const today = new Date().toLocaleDateString('en-GB', { timeZone: 'UTC' });

test('the course period runs from the recorded enrollment to the issue date', () => {
  assert.deepEqual(access.certificateDates(new Date('2025-06-01T10:00:00Z'), new Date('2025-05-01T09:00:00Z')),
    { courseDate: '01/05/2025 - 01/06/2025', issueDate: '01/06/2025' });
});

test('the reported staging case: a start later than the issue date is never printed', () => {
  // Original certificate issued 01/06/2025; its course record was (re)created on
  // 14/11/2026. That creation date is not a fact about the student and is not used.
  const dates = access.certificateDates(new Date('2025-06-01T10:00:00Z'), new Date('2026-11-14T08:00:00Z'));
  assert.deepEqual(dates, { courseDate: 'Completed by 01/06/2025', issueDate: '01/06/2025' });
  assert.ok(!dates.courseDate.includes('2026'));
});

test('without a recorded enrollment nothing is invented', () => {
  for (const enrolledAt of [null, undefined]) {
    assert.deepEqual(access.certificateDates(new Date('2025-06-01T10:00:00Z'), enrolledAt),
      { courseDate: 'Completed by 01/06/2025', issueDate: '01/06/2025' });
  }
});

test('dates never depend on the current date or the server time zone', () => {
  const dates = access.certificateDates(new Date('2024-01-31T23:30:00Z'), new Date('2023-12-31T23:59:00Z'));
  assert.deepEqual(dates, { courseDate: '31/12/2023 - 31/01/2024', issueDate: '31/01/2024' });
  assert.ok(!JSON.stringify(dates).includes(today));
  // Same-day enrollment and issue is a valid one-day period.
  assert.equal(access.certificateDates(new Date('2025-06-01T18:00:00Z'), new Date('2025-06-01T08:00:00Z')).courseDate, '01/06/2025 - 01/06/2025');
});

test('every field drawn on the certificate comes from the given data, dates and numbers left-to-right', () => {
  const fields = certificate.certificateFields({
    template: 'legacy', studentName: 'محمد عبد الرحمن الأحمد', courseName: 'الرياضيات',
    courseDate: '01/05/2025 - 01/06/2025', durationHours: 12, issueDate: '01/06/2025',
    certificateNumber: 'KQ2025-0001', verifyReference: 'stg_legacy_certificate',
  });
  const text = Object.fromEntries(fields.map(field => [field.slot, field.text]));
  assert.equal(text.courseDate, `${LRM}01/05/2025 - 01/06/2025`);
  assert.equal(text.issueDate, `${LRM}01/06/2025`);
  assert.equal(text.certNumber, `${LRM}KQ2025-0001`);
  assert.equal(text.duration, `${LRM}( 12 h )`);
  assert.equal(text.website, `${LRM}www.kqacademy.com`);
  // Names keep automatic direction (Arabic right-to-left).
  assert.equal(text.studentName, 'محمد عبد الرحمن الأحمد');
  assert.ok(!fields.some(field => field.text.includes(today)));
  // No duration: nothing is drawn in its place.
  const without = certificate.certificateFields({ studentName: 'S', courseName: 'C', courseDate: 'Completed by 01/06/2025',
    durationHours: null, issueDate: '01/06/2025', certificateNumber: 'KQ2025-0001', verifyReference: 'x' });
  assert.equal(without.some(field => field.slot === 'duration'), false);
});
