# Private original document repair

The repair is isolated in `fix/private-pdf-attachments-20261104`, based on the
latest fetched `origin/main`, `2d9cbd687fc1cffdaa14ab1630f23bdf30bb3a42`.
The existing dirty working tree and the previously completed Bunny repair were
preserved. No deployment, migration, seed, or automatic data repair was run.

## Confirmed cause and read-only inventory

The historical upload handler at commit `c9e7a9e` unconditionally sent uploaded
bytes to ImgBB as an `image` and returned `data.data.url`. It had no document
storage branch. Commit `cac5dd1` later added StoredFile document storage; this
did not rewrite or recover older attachment URLs. The attachment creation API
still accepted arbitrary URLs and the student rendered raw `att.url`, so old
ImgBB image links continued opening instead of original documents.

A PostgreSQL transaction explicitly set to READ ONLY inspected the configured
database on 2026-11-04. Results:

- Attachment rows: **13**, all referencing external `i.ibb.co` JPG paths.
- All 13 are chapter attachments, not lesson-level rows.
- StoredFile rows: **0**, including zero declared PDF or PDF-signature candidates.
- External URLs fetched: **0**. Records repaired or changed: **0**.

The inventory proves those attachment records have no original internal PDF
reference. It does not claim that a JPG response can be reconstructed into the
missing PDF. The originals must be supplied again. Existing rows remain intact;
the UI displays clear original-file reupload guidance and the protected route
returns 410 after authorization. The detailed local audit is outside the commit,
so private course names and source URLs are not published with the source.

`node scripts/audit-attachments.cjs` reproduces the read-only inventory with the
configured DATABASE_URL. It uses only fixed SELECT queries and READ ONLY
transaction configuration, reads no document payloads, and performs no repairs.

## New upload, association and delivery behavior

Both `/api/upload` and `/api/upload-local` preserve original document bytes in
private persistent storage and return `/api/files/<opaque-UUID>`. New documents
are not base64 StoredFile database rows or public image-CDN objects. Existing
image callers retain image-CDN behavior and the legacy image fallback; a private
ownership sidecar preserves fallback previews before avatar/receipt association.

PDF detection considers file bytes as well as extension and declared type.
Validation checks the PDF signature, complete EOF marker, parses the document
with the installed pdf-lib, resolves nonempty page dictionaries, and rejects
encryption. A renamed JPG, malformed PDF, incomplete upload, or empty document
is rejected. The original is never rasterized, re-saved, or relabelled as PDF.
The size limit is **20 MiB**, with streamed request-byte limits before multipart
parsing. Files have SHA-256 integrity metadata, UUID paths, atomic publication,
private permissions, and no symlink or traversal paths.

New attachment association requires the current instructor to own the target
course and upload, or an administrator. New lesson/quiz document references also
check upload ownership, including rejecting absolute/encoded aliases. Nested
course relation writes cannot bypass these dedicated checks. Foreign instructors
cannot make another course's chapter free to bypass document permissions.

Student links use `/api/attachments/<attachment-ID>/file`, with separate native
open-in-new-tab and `?download=1` links. The server resolves lesson/chapter/course
relationships and checks enrollment, owning instructor, administrator, or an
explicitly free published chapter before opening original bytes. Free course
access was not inferred from price. Submission files remain private to their
author and authorized instructor. Receipt URL references cannot grant access to
another user's private original; payment and wallet logic is unchanged.

Valid PDFs return `application/pdf`, `Content-Disposition: inline`, a safe ASCII
filename plus UTF-8 filename*, Content-Length, nosniff, and private no-store
headers. Download uses attachment disposition. HEAD, single byte ranges, If-Range,
206 and 416 support native desktop/mobile PDF viewers. Old shared-cache
validators never bypass fresh authorization. Non-PDF documents download with a
safe binary MIME; actual image bytes are sniffed when an image is returned.

Legacy StoredFile references are read only after access checks and validated
against actual bytes. No handler fetches arbitrary external URLs. Old
`/uploads/<filename>` references can read an explicitly mounted
DOCUMENT_LEGACY_STORAGE_DIR, with strict filenames, bounded reads and traversal/
symlink checks; absent originals produce reupload guidance. No existing file or
database row is silently moved, converted, or deleted.

## Coolify configuration required before reviewed deployment

Create a **separate named Volume Mount** on the application:

| Setting | Value |
| --- | --- |
| Volume name | `kq-academy-documents` |
| Destination path in container | `/data/kq-documents` |
| Runtime environment | `DOCUMENT_STORAGE_DIR=/data/kq-documents` |
| Source path | Leave empty for a Docker-managed named volume |

Use Coolify Application > Configuration > Persistent Storage > Add Volume Mount.
The destination must match DOCUMENT_STORAGE_DIR exactly. An alternative bind
mount can map an independently maintained server directory such as
`/srv/kq-academy/documents` to the same container destination. Configure ownership
for the actual application runtime UID/GID; new directories use 0700 and files
0600. Do not mount documents under public, the application image working
directory, or `/data/bunny-uploads`. Production fails closed without an explicit
absolute private storage path outside the image's working directory.

Mount the same persistent data for all workers/releases. Replicas on different
servers need shared persistent storage; independent local volumes are not a
shared document store. Back up originals and metadata together and test restore.
Adding a volume cannot recover files from a deleted former container. Check any
proxy body limit supports 20 MiB plus multipart overhead. Existing legacy files
require their own intentionally mounted DOCUMENT_LEGACY_STORAGE_DIR if used.

These are reviewable setup instructions; no Coolify configuration or redeployment
was changed. Source:
https://coolify.io/docs/core/persistent-storage/storage-mounts/volume-mounts
and https://coolify.io/docs/core/persistent-storage/storage-mounts/bind-mounts.

## Validation and practical checks

Tests cover both upload endpoints, byte-identical multi-page original PDF,
fake/corrupt/truncated/encrypted PDFs, persistence and integrity, open/download,
HEAD/ranges, names, enrollment/free-chapter/teacher permissions, traversal,
symlinks, external links, stale-cache requests, and unauthorized file association.
Existing Bunny regression tests are included without changing their implementation.

Full TypeScript validation finds pre-existing issues in five unchanged source
files (11 diagnostics after all Next types are generated):
`src/app/courses/page.tsx:61`, and generated Next route validators for
community/shorts comments/like handlers with synchronous params. Those files
remain unchanged. The base next.config.ts already skips type errors during build;
Webpack success must not be presented as full typecheck success.

This Windows verification host returns EISDIR from readlink on regular files.
Build verification uses the already established external errno workaround and
the existing database connection for read-only static generation. Neither the
workaround nor credentials are copied into the application source.

After review and storage configuration, upload an original from an affected
course, open it as an enrolled student in Chrome and a mobile browser, download
it and compare SHA-256, verify denied access from a second account, and check
survival across a staging container replacement. Reupload the 13 missing
originals through normal instructor actions; this repair does not manufacture
or automatically replace them.

Final automated tests: **149 passed, 0 failed**, including **62 new document
cases** and the 87 existing Bunny regression cases. SHA-256 verification
confirmed all 296 original dirty-working-tree files remain unchanged.
The final Webpack build completed successfully, including all 134 static
generation entries, after the last security fix. No source changes followed
that successful verification.

## Changed files

```text
.gitignore
docs/pdf-attachments-repair.md
scripts/audit-attachments.cjs
src/lib/attachment-access.ts
src/lib/attachment-links.ts
src/lib/document-validation.ts
src/lib/file-upload.ts
src/lib/owned-document.ts
src/lib/private-file-delivery.ts
src/lib/private-file-storage.ts
src/components/AttachmentLinks.tsx
src/app/api/upload/route.ts
src/app/api/upload-local/route.ts
src/app/api/files/[id]/route.ts
src/app/api/attachments/route.ts
src/app/api/attachments/[id]/route.ts
src/app/api/attachments/[id]/file/route.ts
src/app/api/chapters/[chapterId]/route.ts
src/app/api/courses/[id]/route.ts
src/app/api/lessons/route.ts
src/app/api/quizzes/create/route.ts
src/app/api/quizzes/[id]/submit/route.ts
src/app/courses/[courseId]/learn/page.tsx
src/app/courses/[courseId]/learn/CoursePlayerClient.tsx
src/app/instructor/courses/[courseId]/chapters/ChaptersClient.tsx
src/app/instructor/courses/[courseId]/chapters/CurriculumClient.tsx
tests/private-file-upload.test.cjs
tests/private-file-delivery.test.cjs
tests/attachment-management.test.cjs
tests/attachment-links-render.test.cjs
```
