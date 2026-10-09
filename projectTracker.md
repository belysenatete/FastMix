# Project tracker

Last updated: 2026-10-09

## Current status

- **Build status:** Implementation started. Local-first mode is the MVP; external production providers remain explicit integrations.
- **Current phase:** Phase 5 - Asynchronous processing pipeline.
- **Progress:** Phase 4 complete in code: uploads pass through the authenticated Next.js server to FastAPI, which checks project ownership, file extension/signature, and the 100 MB limit before writing to private MinIO storage and saving PostgreSQL metadata.
- **Current focus:** Add background jobs and a clearly labeled demo processor without claiming to perform AI mixing.
- **Next task:** Implement job enqueue/status/retry APIs, a Redis-backed Python worker, and mixer progress feedback, then checkpoint Phase 5.
- **Blockers/dependencies:** TypeScript passes and Compose config parses. Docker Desktop cannot start and Python is not on PATH, so service runtime behavior cannot be exercised here. GitHub remote is available. Credentials remain user-maintained in [credentials.md](credentials.md); do not read unless needed.

## Phase status

Status values: `Not started`, `In progress`, `Complete`, or `Blocked`.

| Phase | Status | Notes |
|---|---|---|
| 0. Confirm scope and architecture | Complete | Documented scope and local-first MVP; production providers need credentials/configuration. |
| 1. Repository and local development foundation | Complete | Next.js/TypeScript scaffold, Compose infrastructure, PostgreSQL schema, FastAPI service, and setup README. Pushed. |
| 2. Public site and authentication | Complete | Local demo auth only; production OAuth/password auth needs a configured provider. Pushed. |
| 3. Mixer workspace and project data | Complete | TypeScript check passed; PostgreSQL-backed project API plus browser preview fallback. Pushed. |
| 4. Secure audio upload and storage | Complete | Private MinIO storage; authenticated upload/delete/list proxy; signature, size, and ownership checks. TypeScript and Compose config passed; Docker daemon unavailable for runtime validation. Pushed after this tracker update. |
| 5. Asynchronous processing pipeline | In progress | |
| 6. Playback, downloads, and library | Not started | |
| 7. Account, help, affiliate, and billing | Not started | |
| 8. Security, accessibility, and release readiness | Not started | |
| 9. Iterate from usage | Not started | |

## Work log

- 2026-10-09: Build authorized through Phase 7; user requested a commit and push after each phase.
- 2026-10-09: Phase 4 completed in code. Added private MinIO local storage, authenticated streaming Next.js-to-FastAPI uploads, format/signature/size checks, project ownership validation, and track list/delete operations. TypeScript passed and Compose config parsed; Docker Desktop reported it could not start, so service behavior remains runtime-unverified.
- 2026-10-09: Phase 3 completed. Added protected studio navigation, mixer and library interfaces, browser-persisted projects, PostgreSQL project CRUD routes scoped to the demo user, and track metadata. TypeScript check passed; database execution is not yet verified.
- 2026-10-09: Phase 2 completed. Added the public landing page, plan/FAQ/testimonial interactions, EN/FR hero copy selector, help/legal routes, and signed local demo session. TypeScript check passed; ESLint was interrupted and remains unverified.
- 2026-10-09: Phase 1 completed. Created Next.js 16 / React 19 / TypeScript app under `web/`, PostgreSQL schema, Redis/Postgres Compose setup, FastAPI health service foundation, environment template, and setup README.
- 2026-10-09: Created the roadmap, feature description, coding principles, credentials template, and tracker.
- 2026-10-06: Inspected the Easymix public site and signed-in areas. Actual mix output was not observed because no audio was processed.

## Update checklist

At the beginning of a coding session, read this tracker and resume from **Current focus**. At the end of each coding session:

1. Update the current phase and status.
2. Record completed work and any verification performed.
3. State the next concrete task and any blocker/dependency.
4. Commit and push a checkpoint for each completed phase, as requested by the user.
