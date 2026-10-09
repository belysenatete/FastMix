# Project tracker

Last updated: 2026-10-09

## Current status

- **Build status:** Implementation underway. Local-first MVP with explicit provider integration limits.
- **Current phase:** Phase 7 - Account, help, affiliate, and billing.
- **Progress:** Phase 6 complete in code: outputs have version history, authorized playback/download controls, status-aware library behavior, and project deletion cleans up private audio storage.
- **Current focus:** Build account settings, help resources, referral preview, and honest billing states; external auth and payment providers remain unconfigured.
- **Next task:** Complete Phase 7 UI and local preview behavior, then checkpoint and push Phase 7.
- **Blockers/dependencies:** TypeScript passes and Compose config parses. Docker Desktop cannot start and Python is not on PATH, so runtime service behavior remains unverified. Credentials remain user-maintained in [credentials.md](credentials.md); do not read unless required.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0. Confirm scope and architecture | Complete | Documented scope and local-first MVP; production providers need credentials/configuration. |
| 1. Repository and local development foundation | Complete | Next.js/TypeScript scaffold, Compose infrastructure, PostgreSQL schema, FastAPI service, and setup README. Pushed. |
| 2. Public site and authentication | Complete | Local demo auth only; production auth provider remains unconfigured. Pushed. |
| 3. Mixer workspace and project data | Complete | Studio shell, session CRUD, project APIs, and library. TypeScript check passed. Pushed. |
| 4. Secure audio upload and storage | Complete | Private MinIO upload/list/delete track APIs with ownership, signature, and size checks. TypeScript and Compose config passed; runtime unavailable. Pushed. |
| 5. Asynchronous processing pipeline | Complete | Redis queue, PostgreSQL job lifecycle, retry/recovery, Python FFmpeg mix/master preview, WAV output, and signed downloads. TypeScript and Compose config passed; worker runtime unavailable. Pushed after this tracker update. |
| 6. Playback, downloads, and library | Complete | Version history, inline playback, downloads, and deletion cleanup. TypeScript passed; service runtime remains unverified. Pushed. |
| 7. Account, help, affiliate, and billing | In progress | |
| 8. Security, accessibility, and release readiness | Not started | |
| 9. Iterate from usage | Not started | |

## Work log

- 2026-10-09: Build authorized through Phase 7; the user requested a commit and push at the end of each phase.
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
