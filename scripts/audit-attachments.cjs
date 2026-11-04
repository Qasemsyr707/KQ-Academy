/* Read-only inventory. No external requests, repairs, or database writes. */
function classifyAttachment(row) {
  const url = row.url || '';
  if (/^\/api\/files\/[A-Za-z0-9_-]+(?:\.pdf)?$/.test(url)) return 'internal-file-needs-byte-validation';
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(url)) return 'legacy-container-file-needs-original-volume';
  if (url.startsWith('data:')) return 'inline-data-reupload-original';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'invalid-source-reupload-original';
    if (/\.(?:jpe?g|png|webp|gif|avif)$/i.test(parsed.pathname) || /(?:^|\.)ibb\.co$/i.test(parsed.hostname)) {
      return 'external-image-is-not-original-pdf';
    }
    return 'external-source-unverified-reupload-original';
  } catch { return 'invalid-source-reupload-original'; }
}

function safeSource(value) {
  if (value?.startsWith('data:')) return 'data:[omitted]';
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch { return String(value || '').slice(0, 255); }
}

async function auditAttachments(prisma) {
  return prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const counts = {};
    const samples = [];
    let total = 0;
    for (let offset = 0;; offset += 100) {
      // Bound inline data read from the database; never load document payloads.
      const rows = await tx.$queryRawUnsafe(
        'SELECT "id", "name", "lessonId", "chapterId", "courseId", left("url", 2048) AS "url", length("url") AS "urlLength" FROM "Attachment" ORDER BY "id" LIMIT $1 OFFSET $2',
        100, offset,
      );
      for (const row of rows) {
        const classification = classifyAttachment(row);
        counts[classification] = (counts[classification] || 0) + 1;
        total++;
        if (samples.length < 50) samples.push({
          id: row.id, name: row.name, classification, source: safeSource(row.url),
          lessonId: row.lessonId, chapterId: row.chapterId, courseId: row.courseId,
        });
      }
      if (rows.length < 100) break;
    }
    const stored = await tx.$queryRawUnsafe(
      'SELECT count(*)::int AS "total", count(*) FILTER (WHERE "mimeType" = $1)::int AS "declaredPdf", count(*) FILTER (WHERE "data" LIKE $2)::int AS "pdfMagicCandidates" FROM "StoredFile"',
      'application/pdf', 'JVBERi0%',
    );
    return { readOnly: true, externalRequests: 0, repairedRecords: 0, total, counts,
      legacyStoredFiles: stored[0], samples };
  }, { timeout: 60000 });
}

module.exports = { auditAttachments, classifyAttachment };
if (require.main === module) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  auditAttachments(prisma).then(report => console.log(JSON.stringify(report, null, 2)))
    .catch(() => { console.error('Attachment audit could not read the database. No records were changed.'); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
