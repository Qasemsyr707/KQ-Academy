# Bunny Stream upload repair

This change is isolated from the original, dirty working tree. Its base is
`origin/main` at `f15a6385d8afb286dea125219e6c23d0018e1c14`.
It does not change payment, wallet, Prisma schema, or database configuration.

## Findings and limits of the diagnosis

The base and local create-video implementations already generated the correct
`SHA256(libraryId + apiKey + Unix-expiry-seconds + videoId)` with a 24-hour
lifetime. A short signature lifetime is therefore **not** established as the
cause of the reported production failure.

The base implementation created a new VideoId on every submission and saved an
embed immediately after TUS success. It had no server-verified processing gate,
durable creation idempotency, or authenticated cross-page resume operation.
CurriculumClient also supplied an unsigned fallback expiry and omitted Bunny's
required title metadata. The local upload helper already introduced one same-ID
recovery and resume proofs, but disabled persistent resume, omitted course
ownership, and still resolved before encoding completed.

The installed tus-js-client has an implicit HEAD-error-to-POST fallback. The
repair intercepts failed responses before that fallback, preserving the actual
status through nested errors. PATCH/HEAD 404 or 410 never receives a transient
retry against the same URL. A server-authorized check of the existing video is
required before a single fresh TUS resource can be created for that VideoId.

Bunny documents that an incomplete TUS resource expires at its **original**
AuthorizationExpire or after approximately 48 hours of inactivity, whichever
comes first. Re-signing does not extend that resource lifetime. A missing
resource's bytes cannot be recovered; its replacement starts at offset zero.
Production request timestamps and Bunny-side logs are still needed to identify
why the specific reported resource disappeared. The code alone cannot prove
expiry, deletion, or a provider fault in that request.

References checked on 2026-11-04:

- https://bunny.net/docs/stream/tus-resumable-uploads
- https://bunny.net/docs/api-reference/stream/manage-videos/get-video
- https://tus.io/protocols/resumable-upload
- Installed tus-js-client 4.3.1, `lib/upload.js`, `_resumeUpload`.

## Behavior

- Browser-to-Bunny transfer, sequential 16 MiB chunks, bounded transient backoff.
  Next.js receives only small JSON authorization/status requests.
- A stable UUID identifies the operation before any create request. Current user,
  course, purpose, file metadata and sampled content identify browser records.
  Each saved TUS URL has an additional file/library/VideoId association.
- The server rechecks role and current course ownership on create, refresh and
  status. A signed seven-day capability binds user/course/purpose/operation and
  video/library; the general Bunny key stays on the server.
- Original resource expiry is recorded separately from renewed signatures.
  Session recovery is limited to one restart across manual retries and reloads.
- Uploading, Paused, Retrying, Processing, Ready, Failed states show progress.
  Reselect the same file after a reload, then submit to resume. A live resource
  resumes from Bunny's acknowledged offset; a missing one starts from zero.
- Processing is polled at five-second intervals for at most 120 checks. On a
  timeout, retry checks processing again without retransferring the video.
- Transfer completion clears the TUS URL. Operation identity remains until the
  ready URL is saved successfully, then browser records are removed. Retrying a
  failed application save does not create another video.
- Lesson, preview and short save routes independently require Bunny status 4.
  Existing external URLs, attachments and live lessons retain their behavior.

## Durable metadata requirement

Set `BUNNY_UPLOAD_STATE_DIR` to a private persistent directory shared by all
workers serving this installation, outside disposable release directories. The
default is `.data/bunny-uploads` under the process working directory. It stores
small JSON operation records, never video bytes or Bunny keys. POSIX deployments
fsync claim/metadata directories before contacting Bunny and after committing
the video result. Windows uses exclusive directory creation and synced files.

Keep these records across process restarts and releases. Deleting them defeats
creation idempotency. If a create POST succeeds upstream but its response or the
local result write is lost, subsequent requests deliberately fail closed with
409; they never automatically create a replacement video. Reconcile the operation
with Bunny before manually recording a verified VideoId. An uncertain outcome
cannot safely be treated as a failed create.

## Validation and practical Bunny checks

`npm test` uses the installed real tus-js-client with a scripted HTTP transport,
mocked provider JSON calls, temporary metadata directories and mocked Prisma
calls. It performs no live provider uploads or database writes. Coverage includes
successful upload, interruption/offset recovery, signature expiry, PATCH/HEAD
404/410, stale/wrong-identity resume, bounded recovery, pause/resume, lost create
responses, concurrency, unauthorized instructors, processing and save guards.

Before release, verify a multi-GB file in a staging Bunny library, 16 MiB PATCH
acceptance, bandwidth throttling, offline/online and reload, expired/deleted TUS
sessions with the same VideoId, server restart with persistent metadata, and
encoding failure. Confirm no Lesson appears until status 4 and no duplicate
video is created. Check readiness and playback from a student account.

Automated suite result: **87 passed, 0 failed** (28 client transfer tests,
37 server cases including subtests, and 22 save cases including subtests).

Full TypeScript validation finds five pre-existing errors once Next's route
types are generated: `src/app/courses/page.tsx:61` supplies
`(string | undefined)[]` to `string[]`, and the comments/like routes under
`src/app/api/community/[id]` and `src/app/api/shorts/[id]` type `params` as an
object instead of Next 16's Promise. All five source files are byte-identical
to `origin/main`; none of the upload changes has a TypeScript error. These
unrelated fixes were not copied from the original dirty working tree.
The base `next.config.ts` already has `ignoreBuildErrors: true`; Webpack
compilation success is not a claim that the full typecheck passed.

On this Windows verification host, `fs.readlink` returns EISDIR for ordinary
files, including in the original working tree. Webpack compiled successfully
with a verification-only preloader outside the repository that normalizes
that incorrect errno to EINVAL for non-symlinks. No application or dependency
source was changed for that workaround. Static page generation requires the
existing database connection; a dummy unreachable database intentionally
causes the unmodified `/curriculum` page to fail prerendering.

Final `npm run build` completed successfully with Webpack, including all 134
static-generation entries, using the existing database connection for read-only
SSG and the external host workaround. No database migration, seed or data
modification was performed. SHA-256 verification confirmed all 296 original
working-tree files remain unchanged. No push or deployment was performed.

## Changed files

```text
.gitignore
package.json
docs/bunny-upload-repair.md
src/lib/bunny-upload.ts
src/lib/bunny-upload-server.ts
src/lib/bunny-upload-operations.ts
src/hooks/use-bunny-upload.ts
src/components/BunnyUploadStatus.tsx
src/app/api/bunny/create-video/route.ts
src/app/api/bunny/refresh-upload/route.ts
src/app/api/bunny/upload-status/route.ts
src/app/api/lessons/route.ts
src/app/api/courses/[id]/route.ts
src/app/api/instructor/shorts/route.ts
src/app/instructor/courses/[courseId]/chapters/ChaptersClient.tsx
src/app/instructor/courses/[courseId]/chapters/CurriculumClient.tsx
src/app/instructor/shorts/UploadShortClient.tsx
tests/load-ts.cjs
tests/bunny-upload.test.cjs
tests/bunny-upload-server.test.cjs
tests/bunny-save.test.cjs
```
