# Project tracker

Last updated: 2026-10-09

## Current status

- **Build status:** Implementation started. Local-first mode is the MVP; external production providers remain explicit integrations.
- **Current phase:** Phase 3 - Mixer workspace and project data.
- **Progress:** Phase 2 complete: public marketing sections and navigation, working FAQ/pricing/testimonial interactions, English/French hero copy selection, legal/help routes, and a signed development-only demo session with protected studio entry.
- **Current focus:** Build the authenticated app shell, mixer session state, track metadata, project/library behaviors, and PostgreSQL-backed API foundations.
- **Next task:** Implement the studio workspace and project/session operations, then checkpoint Phase 3.
- **Blockers/dependencies:** GitHub remote is configured and Phases 0-1 are pushed. Python is not on PATH, so worker containers cannot be run directly in this environment. Credentials are user-maintained in [credentials.md](credentials.md); do not read them unless a task requires a specific credential.

## Phase status

Status values: `Not started`, `In progress`, `Complete`, or `Blocked`.

| Phase | Status | Notes |
|---|---|---|
| 0. Confirm scope and architecture | Complete | Documented scope and local-first MVP; production providers need credentials/configuration. |
| 1. Repository and local development foundation | Complete | Next.js/TypeScript scaffold, Compose infrastructure, PostgreSQL schema, FastAPI health service, and setup README. Pushed. |
| 2. Public site and authentication | Complete | Local demo auth only; production OAuth/password auth needs a configured provider. Pushed after this tracker update. |
| 3. Mixer workspace and project data | In progress | |
| 4. Secure audio upload and storage | Not started | |
| 5. Asynchronous processing pipeline | Not started | |
| 6. Playback, downloads, and library | Not started | |
| 7. Account, help, affiliate, and billing | Not started | |
| 8. Security, accessibility, and release readiness | Not started | |
| 9. Iterate from usage | Not started | |

## Work log

- 2026-10-09: Build authorized through Phase 7; user requested a commit and push after each phase.
- 2026-10-09: Phase 2 completed. Added the public landing page, plan/FAQ/testimonial interactions, EN/FR hero copy selector, FAQ/solution/pricing/legal routes, and a signed local demo session. TypeScript check passed. ESLint produced no output and was interrupted; lint remains unverified.
- 2026-10-09: Phase 1 completed and pushed. Created the Next.js 16 / React 19 / TypeScript app under `web/`, PostgreSQL schema, Redis/Postgres Compose setup, FastAPI health service foundation, environment template, and setup README.
- 2026-10-09: Created the project roadmap, feature description, coding principles, credential template, and tracker.
- 2026-10-06: Inspected the Easymix public site and signed-in areas with Playwright. Mixing output was not observed because no audio was uploaded or processed.

## Update checklist

At the beginning of a coding session, read this tracker and resume from **Current focus**. At the end of each coding session:

1. Update the current phase and status.
2. Record completed work and any verification performed.
3. State the next concrete task and any blocker/dependency.
4. Commit and push a checkpoint for each completed phase, as requested by the user.
