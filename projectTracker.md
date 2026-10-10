# Project tracker

Last updated: 2026-10-11

## Current status

- **Build status:** Phases 0–9 complete as a local-first MVP and evidence-labeled backlog. Production release is not ready until the blockers below are resolved.
- **Current phase:** Phases 0–9 complete; awaiting staging and real usage evidence.
- **Progress:** Phase 9 complete as a provisional next-release backlog. It records repository evidence, known release blockers, recommended telemetry, and a reprioritization rule. No real user data was available.
- **Current focus:** Complete local Clerk authentication and continue production readiness.
- **Next task:** Choose the public website address and hosting platform; the production Clerk instance needs the final domain before its live keys and allowed URLs can be configured.
- **Blockers/dependencies:** Clerk development sign-up/email verification succeeded in Chromium. Restarting stale Next.js and Docker API processes fixed the studio redirect and old worker-header mismatch. The studio opens; project, track, and job endpoints work. A second verified account saw only its own session, and requests for the first account's tracks/jobs returned 404. Production Clerk instance/domain, audio processing beyond normalization, payments, hosting, retention rules, backups/restore, monitoring, and staging remain unconfigured. Full `npm audit` reports five high-severity advisories in the development-only `braces` dependency chain, with no patched version currently published; `npm audit --omit=dev` reports zero vulnerabilities. Credentials remain user-maintained in [credentials.md](credentials.md); never display their values.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0. Confirm scope and architecture | Complete | Documented scope and local-first MVP; production providers need credentials/configuration. |
| 1. Repository and local development foundation | Complete | Next.js/TypeScript scaffold, Compose infrastructure, PostgreSQL schema, FastAPI service, and setup README. Pushed. |
| 2. Public site and authentication | Complete (local development) | Clerk sign-up, email verification, session redirect, studio access, and project/audio API requests verified in Chromium. A second account could not read the first account's track/job data. Production instance/domain remain open. |
| 3. Mixer workspace and project data | Complete | Studio shell, session CRUD, project APIs, and library. TypeScript check passed. Pushed. |
| 4. Secure audio upload and storage | Complete | Private MinIO upload/list/delete track APIs with ownership, signature, and size checks. TypeScript and Compose config passed; runtime unavailable. Pushed. |
| 5. Asynchronous processing pipeline | Complete | Redis queue, PostgreSQL job lifecycle, retry/recovery, Python FFmpeg mix/master preview, WAV output, and signed downloads. TypeScript and Compose config passed; worker runtime unavailable. Pushed after this tracker update. |
| 6. Playback, downloads, and library | Complete locally; production verification open | Version history playback/download and mixer output controls verified against the local services; account isolation and deletion cleanup still need staging verification. |
| 7. Account, help, affiliate, and billing | Complete | Browser-local profile preferences, sound guide, support FAQ/contact link, clearly labeled referral preview, and no-purchase billing states. TypeScript and production build passed; real providers are not configured. Pushed. |
| 8. Security, accessibility, and release readiness | Local checks complete; production blockers open | Loopback-only Compose ports, upload quotas, job-safe mutation locks, security headers, runtime-rendering fixes, and mixer playback control. Build and lint pass; local browser audio workflow passes. Production identity, provider policy, full accessibility review, full audit remediation, operations, and staging verification remain open. See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). |
| 9. Iterate from usage | Complete (provisional) | Prioritized evidence-labeled backlog and telemetry/review plan are in [nextReleaseBacklog.md](nextReleaseBacklog.md). No user usage data exists; reprioritize after a staging/preview cohort. |

## Work log

- 2026-10-11: Integrated Clerk development auth after the user added development keys to `credentials.md`. Installed `@clerk/nextjs`; added the Next.js 16 `src/proxy.ts`, Clerk provider/UI and session reads; removed the email-only demo route/session; added stable Clerk IDs to app and worker ownership paths plus migration `003_clerk_identity.sql`. Copied keys locally to ignored `web/.env.local` without displaying them. Docker migration ran and `npm run build` passed. Chromium confirmed account creation and email verification; the studio initially failed because stale Next.js and Docker API processes still held pre-integration code. Restarted Next.js and rebuilt API/processor containers; the studio opened and project, track, and job requests succeeded.
- 2026-10-11: Verified owner isolation using the user's second verified Clerk account. Its library showed only its own session; requests for a project created under the first account returned 404 for both tracks and jobs. Unauthenticated project listing returned 401 and studio access redirected to login. Next production dependency: select the public domain and hosting platform so the Clerk production instance can be configured accurately.

- 2026-10-10: Replaced retired upstream MinIO server/client image references with version-pinned PGSTY Silo server/client images after Docker Hub denied the removed `minio/mc` image and Quay returned 401. User's host successfully pulled these images; Compose config parsing passes, but service runtime still needs host verification.
- 2026-10-10: User's host successfully pulled storage, Redis, and PostgreSQL images and built both Python worker images. The PostgreSQL 18 container restarted unhealthy. Updated its named-volume mount to `/var/lib/postgresql`, the PostgreSQL 18 image's versioned data-volume location. Compose config parsing passes; container logs/runtime remain inaccessible from the restricted executor.
- 2026-10-10: User confirmed successful Compose startup after the PostgreSQL 18 volume-path correction: db and Redis healthy; Silo running; API and processor started; storage-init and migrate completed. Created ignored `web/.env.local` from `.env.example` for local preview configuration. Next verify the browser workflow.
- 2026-10-10: Started the Next.js dev server from `web/`; `/` returned HTTP 200. The user ran `npm run dev` from the repository root and got ENOENT; verified the app package is under `web/`. The local browser workflow is now verified in Chromium.
- 2026-10-10: Production-readiness iteration: moved studio cookie/session validation to a request-time Suspense boundary, rounded decorative waveform heights to avoid server/client float mismatch, added an inline audio player to completed mixer sessions, and fixed horizontal overflow in the mobile mixer/library grids. `npm run build` passed; `npm run lint -- src` passed; Chromium reported no console errors on the landing/studio routes, confirmed playback of the 3-second output plus WAV download, and showed no horizontal overflow at 390 px with visible keyboard focus. `npm audit --omit=dev` found 0 vulnerabilities. Full audit still reports five linked high-severity `braces` advisories in the development lint-toolchain dependency tree; the upstream advisory lists no patched version. Updated release checklist; production gates remain open.

- 2026-10-09: Build authorized through Phase 7; the user requested a commit and push at the end of each phase.
- 2026-10-09: Phase 8 repo-level security and release review completed. Bound local service ports to loopback, added 20-track/500 MB project audio caps, coordinated track/project mutation with active jobs, added browser security headers and release checklist. Lint, TypeScript, production build, and Compose config passed. Full audit still reports development `braces` advisory chain; Docker/staging not available.
- 2026-10-09: Phase 9 backlog drafted from observed product scope and code review. No production/staging use, telemetry, or support feedback exists, so priorities are provisional rather than user-validated.
- 2026-10-09: Phase 7 completed in code. Added account settings, profile preferences, a sound guide with copyable examples, support FAQs/contact, affiliate preview, and billing/invoice empty states. No real purchases, payouts, or account security claims are enabled. TypeScript and Next.js production build passed.
- 2026-10-09: Phase 6 completed in code. Added version history with playback and downloads, status-aware library controls, and project deletion cleanup across MinIO and PostgreSQL. TypeScript passed; service runtime is unavailable.
- 2026-10-09: Phase 5 completed in code. Added queued/processing/completed/failed jobs, Redis dispatch, worker retry/recovery, FFmpeg normalization/mixing preview, output storage, and signed output download. The preview is not AI processing. TypeScript and Compose config passed; Docker Desktop and Python runtime are unavailable for execution.
- 2026-10-09: Phase 4 completed in code. Added private MinIO storage, authenticated Next.js-to-FastAPI uploads, file signature/size checks, project ownership checks, and track list/delete operations. TypeScript passed and Compose config parsed; Docker Desktop could not start.
- 2026-10-09: Phase 3 completed. Added protected studio navigation, mixer/library screens, browser preview projects, and PostgreSQL project CRUD routes. TypeScript check passed; database execution remains unverified.
- 2026-10-09: Phase 2 completed. Added the public landing page, pricing/FAQ/testimonial interactions, EN/FR hero copy selection, legal/help routes, and a signed local demo session. TypeScript passed; ESLint remains unverified.
- 2026-10-09: Phase 1 completed. Added Next.js 16 / React 19 / TypeScript app, PostgreSQL schema, Redis/Postgres Compose setup, FastAPI foundation, environment template, and README.
- 2026-10-09: Created the roadmap, feature description, coding principles, credentials template, and tracker.
- 2026-10-06: Inspected Easymix public and signed-in flows. Actual Easymix processing output was not observed.

## Session update checklist

At the start of a work session, read this tracker and resume from **Current focus**. At each completed phase boundary:

1. Update phase status, completed work, verification, blockers, and next task.
2. Commit and push that phase checkpoint, as the user requested.
