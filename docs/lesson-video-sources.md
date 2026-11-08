# Lesson video sources

The lesson editor supports uploading a new video with the existing resumable
uploader or linking a video that already belongs to the Academy's configured
Bunny Stream library. Linking performs a metadata/readiness check; it does not
create, fetch, or upload another video file.

## Storage and compatibility

`Lesson.videoUrl` remains the single active video reference. No Prisma schema
change, migration, backfill, deletion, or video replacement job is required.
Existing lesson IDs, chapter/course relations, ordering, attachments, and student
progress remain in place. The editor's `videoSource` value selects validation
and upload behavior; it is not a new database column.

New Bunny references are normalized to an HTTPS embed URL containing the library
and video IDs plus validated player options. Only the exact approved Bunny
player hosts are accepted. Pasted iframe code contributes only its validated
`src`; its HTML, scripts, styles, and other attributes are never stored or
rendered. Pasted playback tokens and expiry values are removed, since a saved
lesson must not depend on an expiring link.

The server verifies the configured library and video readiness before saving a
new or changed Bunny reference. A missing video or one still processing cannot
be saved as a ready lesson. A title-only edit leaves the stored reference alone,
including legacy sources. Replacing a source updates only that lesson's active
reference; it does not delete the former Bunny video or any lesson attachment.

## Playback and access

Course metadata must not expose locked lesson video references. The lesson
playback endpoint checks the viewer's current access before returning the
playback URL. A paid lesson requires an eligible enrolled viewer, the owning
instructor, or an administrative role; published free content follows the
platform's free-course/free-chapter rules. Changing an initial lesson ID in the
URL must not bypass the server check.

Bunny videos play in the official iframe player. A narrow `frame-src` policy
permits the approved player origins without permitting arbitrary iframe sites.
The iframe sends only the page origin as a cross-origin referrer so the library's
domain restrictions can continue to work. The existing completion/progress
workflow remains separate from playback.

Public mobile catalogue/detail and enrolled dashboard responses expose `videoUrl: null`,
`hasVideo`, and `playbackUrl` for lessons. Mobile clients should request this
`playbackUrl` with their existing NextAuth cookie or `Authorization: Bearer ...`
token, then play the returned `{ "url": "..." }` value. Playback responses use
`private, no-store` and vary on cookie/authorization. Bearer tokens are verified
with the configured `NEXTAUTH_SECRET` using HS256, and the current database user,
role, ban state, and course access are checked before returning the media URL.
Cookie sessions also resolve the current database role and ban state before
playback, so an old administrative role in a session cannot bypass a later
role change or account ban.
No fallback signing secret is used by this playback endpoint. Anonymous requests
can obtain URLs only for published free chapters or courses with both prices
set to zero.

If an embed signing key is configured, the server creates a fresh one-hour
playback URL using `SHA256_HEX(key + videoId + expires)`, with expiry in Unix
seconds. Only the resulting token and expiry reach the browser. The general
library API key and token signing key stay on the server. An ordinary unsigned
embed URL does not enforce Academy enrollment: Bunny's own token and domain
security settings still matter.

## Configuration before deployment

- Keep the existing server-side `BUNNY_LIBRARY_ID` and `BUNNY_API_KEY` values.
  Linked videos must belong to this library; linking other libraries is not
  enabled by accepting their domain.
- If the library uses **Embed view token authentication**, supply its separate
  security key as server-only `BUNNY_STREAM_TOKEN_AUTH_KEY` and set
  `BUNNY_STREAM_TOKEN_AUTH_ENABLED=true`. Do not prefix either with `NEXT_PUBLIC_`.
  The application refuses to issue an unsigned Bunny playback URL when the
  enabled flag is true but the key is missing.
- Deploy the signing support before enabling token authentication in Bunny;
  enabling it immediately makes unsigned iframe requests fail. Do not reset a
  production token key as part of this change.
- Preserve the library's allowed-referrer/domain, DRM, direct-access, and CDN
  protection settings. Ensure the deployed Academy domain is allowed. These
  settings are not changed automatically by the application.
- Keep the library's existing authentication switches unchanged during this
  release. Enabling embed token authentication for the entire library also
  affects Shorts and other existing players; audit/sign those separate flows
  before changing a library-wide security switch.
- Preserve `BUNNY_UPLOAD_STATE_DIR` on persistent storage shared by all workers,
  as described in [the upload repair notes](bunny-upload-repair.md). Upload
  retries continue to use the same video operation.

## Verification

The automated tests use mocked provider responses, temporary upload metadata,
and mocked database calls. They do not constitute a live Bunny upload or a real
student-account playback test.

Before deployment, use a staging course and library to check:

1. Upload a new file, pause/resume, disconnect/reconnect, and retry an application
   save. Confirm only one Bunny video is created and no lesson appears until the
   server confirms the save.
2. Link an existing ready video using each approved player host and official
   iframe code. Confirm that only a metadata GET occurs and no create/upload
   request is made.
3. Try empty/malformed URLs, deceptive and external hosts, a foreign library,
   missing videos, and processing/failed videos. Confirm clear errors and no
   saved lesson.
4. Watch with an enrolled student; deny a non-enrolled student, including direct
   playback API calls and altered initial lesson IDs. Inspect public/mobile
   course responses for absence of locked playback references.
5. Rename an existing legacy lesson and confirm the exact stored reference is
   preserved. Replace its source in both directions and verify old Bunny videos
   and chapter/course relations still exist.
6. Open existing PDF attachments using the paperclip flow and the student's
   attachment links. Verify course/chapter/lesson attachments are unaffected.
7. Exercise the editor on desktop and mobile, including repeated save clicks and
   switching source after selecting a file. Verify upload progress, pause/resume,
   Arabic errors/success, and full RTL layout.
8. With token authentication enabled in the staging library, confirm valid signed
   embeds work, unsigned/expired embeds fail, missing signing configuration
   fails closed, and a newly requested playback URL works after an old one
   expires.

Initial validation on the unmodified selected worktree:

- `npm test`: 149 passed, 0 failed.
- `npm run typecheck`: failed on existing Next.js route parameter types in the
  community/shorts comment and like routes, and the category array type in
  `src/app/courses/page.tsx:61`.
- `npm run lint`: 653 existing findings (375 errors, 278 warnings).

Focused save validation after implementation:

- `node --test tests/lesson-video-save.test.cjs`: 25 passed, 0 failed, including
  create/edit authorization, GET-only link verification, legacy-reference and
  PDF preservation, invalid/foreign/missing/unready videos, source replacement,
  concurrent saves, retry after a lost response, and safe database failures.
- `npx eslint tests/lesson-video-save.test.cjs`: passed.

Initial isolated implementation verification on this host:

- `npm test`: 202 passed, 0 failed, including the final cookie-session and
  mobile-dashboard checks (149 passed before this change).
- `npm run typecheck`: failed with the same 11 pre-existing diagnostics in the
  community/shorts route parameter types and `src/app/courses/page.tsx:61`.
  The new lesson source, save, playback, and editor code added no diagnostics.
- Full `npm run lint` still reports 371 errors and 277 warnings, compared with
  the 375 errors and 278 warnings present before this work. Targeted ESLint
  checks of the new production modules/tests, lesson save route, upload helper,
  and CSP configuration pass.
- `npm run build` **did not finish successfully**. Prisma Client generation
  succeeded and Webpack compiled the application, but prerendering the unchanged
  `/curriculum` route failed because `DATABASE_URL` was not configured in the
  isolated worktree. No external database connection was injected for the build.
- `node node_modules/next/dist/bin/next build --webpack --experimental-build-mode compile`
  passed using the same host-only preloader. This validates the compilation,
  route collection and tracing phases independently of database-dependent page
  generation; it is not a successful full `npm run build`.
- The first plain build also encountered the host's existing `fs.readlink`
  `EISDIR` error for a regular file. A subsequent verification run used the
  pre-existing external
  `E:\Projects\Academy\.bunny-verification-tmp\fs-readlink.cjs` preloader via
  process-scoped `NODE_OPTIONS`, with process-scoped workspace `TMP`/`TEMP`.
  The shim maps that incorrect errno to `EINVAL` for non-symlinks. It allowed
  Webpack compilation to complete (about 69 seconds) before the database-dependent
  prerender failed. This shim is outside the app, is not an application change,
  and is not part of the deployed runtime.
- No schema was changed; no migration, seed, production deployment, live Bunny
  upload, real student-account playback, or browser visual test was performed.
- The final media-provider metadata adjustment keeps the existing quality hint
  limited to Bunny videos, so it does not appear on PDF/audio lessons. The
  playback and rendering checks were rerun afterward: 14 passed, 0 failed.

The existing Next.js configuration sets `typescript.ignoreBuildErrors=true`.
A successful production build therefore does not establish a passing full
TypeScript check. Final command results and any environment limits should be
reported alongside this change rather than treating the baseline errors as new
video-source regressions.

## Release validation after publishing approval

On 2026-11-08, the user explicitly approved publication. Before publishing:

- `npm test` was rerun against the complete change: 202 passed, 0 failed.
- Full `npm run build` passed, including page generation and build tracing,
  using the existing database connection in a process-only verification
  preloader. No dotenv files, credentials, schema, or database records changed.
- The same pre-existing Windows filesystem verification shim was used locally.
  It is outside this repository and is not shipped to the hosting provider.
- A read-only audit confirmed that existing Bunny lesson references use one
  library. No videos were created, uploaded, deleted, or rewritten by this audit.
- The full TypeScript and lint baselines described above remain; the production
  build's existing `ignoreBuildErrors` setting was not altered by this release.

## Official references

Checked on 2026-11-08:

- [Embedding videos and supported player parameters](https://bunny.net/docs/stream/embedding)
- [Embedded view token authentication](https://bunny.net/docs/stream/token-authentication)
- [Sign Bunny Player embed URLs on the server](https://bunny.net/docs/stream/player/signed-embeds)
- [Bunny Stream security options](https://bunny.net/docs/stream/security-options)

## Implementation files

```text
next.config.ts
src/app/api/lessons/route.ts
src/app/api/lessons/[id]/route.ts
src/app/api/lessons/[id]/playback/route.ts
src/app/api/mobile/courses/route.ts
src/app/api/mobile/courses/[id]/route.ts
src/app/api/mobile/dashboard/route.ts
src/app/courses/[courseId]/page.tsx
src/app/courses/[courseId]/CourseDetailsClient.tsx
src/app/courses/[courseId]/learn/page.tsx
src/app/courses/[courseId]/learn/CoursePlayerClient.tsx
src/app/instructor/courses/[courseId]/chapters/ChaptersClient.tsx
src/components/BunnyUploadStatus.tsx
src/components/LessonVideoEditor.tsx
src/components/LessonVideoEditor.module.css
src/components/LessonMediaPlayer.tsx
src/lib/bunny-embed.ts
src/lib/bunny-playback.ts
src/lib/bunny-upload-server.ts
src/lib/lesson-links.ts
src/lib/lesson-playback.ts
src/lib/lesson-video.ts
src/lib/media-url.ts
tests/bunny-embed.test.cjs
tests/lesson-media-render.test.cjs
tests/lesson-playback.test.cjs
tests/lesson-video-editor.test.cjs
tests/lesson-video-save.test.cjs
docs/lesson-video-sources.md
```
