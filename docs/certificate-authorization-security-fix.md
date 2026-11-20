# Certificate document authorization review

Date: 2026-11-14 (Asia/Amman)
Base: `audit/phase1-notifications-certificates-20261113`, `42ca9d7`.

## Changed files

| File | Purpose |
|---|---|
| `src/lib/certificate-access.ts` | Reference-independent ownership/staff authorization |
| `src/lib/certificate-render.ts` | Required verified identity, fail closed, no-store responses |
| `src/app/verify/[certId]/page.tsx` | Public verification messaging reflects private documents |
| `src/app/api/mobile/certificates/verify/[certId]/route.ts` | Public privacy contract and session-dependent Vary |
| `tests/certificate-authorization.test.cjs` | Local role, credential, cache and legacy matrix |
| `tests/certificate-http-postgres.test.cjs` | Real NextAuth/HTTP/PostgreSQL reproduction |
| `tests/notifications-certificates-postgres.test.cjs` | Remove token-as-authority expectations and preserve issuance regressions |
| `docs/certificate-authorization-security-fix.md` | Evidence, outcomes and remaining acceptance checks |

## Root cause and change

`resolveCertificate` previously treated knowledge of a certificate ID or verification token as full access, including for anonymous callers. PNG and PDF delivery reused that result as its authorization decision. Public verification also advertised original document links to holders of these references. Existing PostgreSQL assertions explicitly expected that behavior.

References now locate certificates without granting authority. Full access requires the certificate owner, current ADMIN/OWNER, or the INSTRUCTOR assigned to its course. Private delivery calls `requireRequestUser` before certificate lookup: NextAuth cookie identity or verified HS256 Bearer identity is refreshed against the database, including the ban check. Authentication exceptions cannot fall back to anonymous document access. Basic remains a proxy credential and uses the web session; invalid Bearer never falls back to that session.

Public verification preserves certificate numbers, record IDs, new tokens, legacy QR references and original issue data. Unauthorized visitors receive masked names and no document URLs. The page's previous instruction suggesting a QR/link unlocks private details was replaced. No issuance, completion, notification, login, schema or stored certificate data was changed.

All private responses (success, authentication rejection, not found, throttling and unexpected failure) use `Cache-Control: private, no-store`, `CDN-Cache-Control: no-store` and `Vary: Cookie, Authorization`.

## Authorization matrix

Applies equally to PNG and PDF. “Before token/ID” assumes a valid matching reference and successful rendering.

| Caller | Before number | Before token/ID | After any reference |
|---|---|---|---|
| Anonymous | 404 | Allowed | 401 |
| Certificate owner | Allowed | Allowed | 200 |
| Other student | 404 | Allowed | 404 |
| ADMIN / OWNER | Allowed | Allowed | 200 |
| Course instructor | Allowed | Allowed | 200 |
| Unrelated instructor | 404 | Allowed | 404 |
| Banned/deleted user | 404 | Allowed | 401 |
| Invalid/expired credential | 404 | Allowed | 401 |

Unexpected identity infrastructure errors now return 500 without a document; missing authentication configuration returns 503. Errors contain no internal details.

## Validation

- Node 24.22.2 matches `.nvmrc` and package engines. Runtime verifier passed (Next 16.4.5, NextAuth 4.24.15, Prisma Client 5.22.0).
- Installed 621 packages with `npm ci --offline --ignore-scripts --no-audit --no-fund` using the existing local npm cache. No package manifest or lock changes. Explicitly generated Prisma Client using matching local Prisma engine binaries; no database connection or migration.
- TypeScript: `tsc --noEmit --incremental false` passed.
- Final full Node test suite with explicit isolated PostgreSQL and HTTP configuration: **558 tests, 558 passed, 0 failed, 0 skipped**. This supersedes the earlier run with 8 PostgreSQL skips.
- Changed-file ESLint: 0 errors, 1 existing `no-img-element` warning on the verification page.
- Standard Windows build: FAILED with webpack `EISDIR: illegal operation on a directory, readlink` for an ordinary source file. An initial sandboxed attempt also encountered blocked HTTPS. The subsequently authorized guarded build outside the sandbox reproduced the filesystem error.
- Local production build with a process-local Windows filesystem compatibility preload: **PASSED**, including TypeScript, 135 static pages and build traces. The preload only maps EISDIR to EINVAL when `lstat` confirms the target is not a symbolic link; real link, inaccessible-path and missing-path failures remain errors. It is stored outside the repository at `E:/Projects/Academy/.certificate-tools/fs-readlink-compat.cjs`, and is neither application code nor a deployment dependency. The built application was subsequently started **without** this preload for the real HTTP tests.

The new authorization suite has 115 tests including its parent tests. It invokes the real PNG/PDF GET handlers, real certificate resolution and request-user logic; uses real signed/expired Bearer tokens and real PDF construction. The database, NextAuth session resolver, PNG renderer and rate limiter are controlled test doubles. The fixture certificate belongs to `student-b`; `student-a` is a distinct current database identity. Deliberately forged OWNER session role claims do not override its STUDENT database role.

The suite directly observed 404 and no rendering for student-a across both formats and all three references, and 200 for student-b. It covers anonymous access, both administrative roles, related/unrelated instructors, banned users, unknown session users, Basic with/without sessions, valid/invalid/expired Bearer (including a valid owner cookie alongside an invalid or foreign Bearer), session exceptions, missing signing configuration, rate limits, account switching/logout, and historical certificates without tokens. Public mobile verification is checked for masked names and absent private links for every reference format.

Updated PostgreSQL assertions preserve the previous completion/issuance/notification tests and require identical authorization decisions for each reference. All 8 real PostgreSQL tests passed, including concurrent issuance, course completion, notification deduplication, historical references, dates and unrelated wallet/reward regressions.

## Guarded PowerShell build

The Windows-only build script and compatibility tools are local verification artifacts and are excluded from the security commit.

`scripts/verify-certificate-build.ps1` starts by selecting the exact project directory. It stops if package.json is missing, the branch differs, build hooks/scripts differ from the reviewed build chain, datasource configuration introduces alternate URLs, or unreviewed dotenv files exist. It pins Node 24.22.2 and verifies installed Prisma, Client and Engines are all 5.22.0. It additionally checks **both actual engine binaries** against engine commit `605197351a3c8bdd595af2d2a9bc3025bca48ea2`.

The reviewed chain is `node scripts/verify-runtime.cjs && prisma generate && next build --webpack`; there are no prebuild/postbuild hooks. Runtime verification only reads local metadata; Prisma generation produces client files without migrations or database writes. Build datasource is an explicit synthetic loopback URL (`127.0.0.1:65432/kq_security_test_certificate_build`), validated before execution; no database was provisioned on that build-only port. NEXTAUTH_URL is exactly `http://localhost:3000`. Synthetic authentication values are confined to the child process. No dotenv or remote environment settings are written.

## Actual HTTP identity and download evidence

PostgreSQL 18.6 portable binaries were obtained from [EDB](https://get.enterprisedb.com/postgresql/postgresql-18.6-5-windows-x64-binaries.zip), initialized in `E:/Projects/Academy/.certificate-tools/pgdata-1f01f24186`, listening only on `127.0.0.1:55439`. Database: `kq_security_test_certificate_1f01f24186`. There is no Windows service installation. Prisma schema synchronization was applied exclusively to this newly created disposable database after the existing loopback/name guard accepted its URL. Temporary credentials are outside the repository and are not printed in the report.

`tests/certificate-http-postgres.test.cjs` uses real password logins, separate cookie jars, the real NextAuth session endpoint, real PostgreSQL records, actual PNG rendering and PDF generation, and the production server on loopback. It passed all 43 reported tests, including the role/reference/format matrix and additional assertions for Basic/Bearer, expiry, logout, account switching, public pages and legacy documents. Controlled per-request test proxy IPs keep the existing rendering rate limiter active while avoiding interference with this finite authorization matrix.

Final evidence from `E:/Projects/Academy/.certificate-tools/full-tests.log`:

- Session A: `cert_http_a658f2df-e27e-4f32-a01b-8fa742cbed6c_a`.
- Session B and stored certificate owner: `cert_http_a658f2df-e27e-4f32-a01b-8fa742cbed6c_b`.
- Certificate: `cmwgvk925000aby3d5stagmrd`.
- For both PNG/PDF and number/ID/token: A received 404; B received 200 and valid file signatures.
- The logged-in banned fixture was banned in PostgreSQL after login, then received 401 on downloads, confirming current database state overrides an existing session.
- All synthetic fixtures were removed by test cleanup. The temporary application and database processes are stopped after verification; disposable data and tools remain local for reproduction.

## Test log TypeError audit (2026-11-15)

Reviewed every TypeError entry in the final test log. Eight lesson-notification entries originate from `bunny-save.test.cjs` (the mock course has findUnique/update but no findFirst) and `lesson-video-save.test.cjs` (no mock course model). Four payment-notification entries originate from `payment-webhook.test.cjs` (the global mock only supplies payment.findMany, with no course.findUnique). The production call sites are post-save/post-transaction notification lookups, caught and logged by existing notification error handlers. `load-ts.cjs` stubs notification dispatch for these in-memory fixtures, but those direct course lookups happen before dispatch. No missing-method defect was found in the real Prisma client: course.findFirst and course.findUnique both exist. Real PostgreSQL notification tests and the real HTTP certificate tests passed. These unit fixtures do not establish lesson/payment notification coverage; their incomplete mocks remain a separate test-maintenance limitation. No unrelated test or application code was changed to suppress these logs.

## Remaining validation and risks

**READY for an explicitly authorized Staging test of the certificate fix.** Cross-user rejection is now verified through real application authentication and a real isolated database, rather than only test doubles. No Staging action has been performed. This is not a deployment approval or a claim that the native Windows filesystem build issue is resolved.

Not executed: graphical-browser cache/back-button behavior, real reverse-proxy/CDN behavior, and a native Linux/container build. Real HTTP tests validate cookie expiry/decryption and repeated requests after logout/switching, but do not emulate browser disk caches. Run those remaining checks on the deployment target before release acceptance. A normal build on the deployment target must succeed without the local Windows preload; the standard Windows build remains a documented environment limitation.

Previously downloaded files and cached responses cannot be recalled by this fix. New responses prevent storage; cache headers need confirmation through the actual reverse proxy during an authorized Staging test. QR/token disclosure still permits limited public validity lookup by design.

No Push, merge, deploy, Staging/Production change, authentication-key change or Phase 3 work was performed. Build-only environment values were synthetic and process-local.
