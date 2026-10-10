# Release readiness checklist

This checklist reflects the current local preview. A checked code item does not mean the application has been deployed or its external providers are live.

## Repository checks

- [x] Production web dependencies have no advisories in `npm audit --omit=dev` (checked 2026-10-09).
- [x] ESLint reports no errors or warnings.
- [x] TypeScript check and optimized Next.js build pass.
- [x] Docker Compose configuration parses.
- [x] Local database, Redis, MinIO, and API ports bind to loopback only.
- [x] Uploads enforce per-file, per-project total-size, and per-project track-count limits on the server.
- [x] Track edits and project deletion coordinate with active jobs using project-row locks.
- [x] Baseline browser security headers are configured; HSTS is emitted for production builds.
- [x] Local demo authentication is disabled in production.
- [x] Studio request-time session validation is kept out of prerendering; landing waveform is hydration-stable.
- [x] Local browser workflow verified: demo sign-in, track upload, queued FFmpeg preview, inline playback, and WAV download.
- [x] Mixer and library layouts have no horizontal overflow at a 390 px viewport; keyboard tab focus is visible.
- [ ] Full dependency audit is clear. Reviewed 2026-10-10: `npm audit --omit=dev` reports zero production vulnerabilities. The full audit reports five findings in the development-only ESLint dependency chain, all through `braces`; its [upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) currently lists no patched version. Do not force the suggested major Next.js lint-config downgrade; recheck for a compatible upstream fix before release.

## Required before any production deployment

- [ ] Integrate a production identity provider and enforce authenticated ownership on every account and media route.
- [ ] Set unique production secrets in a secret manager. Do not reuse values from `.env.example` or local Compose defaults.
- [ ] Use HTTPS, private network policies, and managed PostgreSQL, Redis, and object storage with least-privilege service identities.
- [ ] Configure storage lifecycle/retention, verify audio deletion, and document data processing and backup retention.
- [ ] Define and test database backups, restore, migration rollback, and disaster recovery.
- [ ] Configure structured operational logs, error reporting, queue/worker metrics, alerts, and retention without logging private audio or credentials.
- [ ] Add verified payment webhooks only after pricing, tax, refund, cancellation, and entitlement behavior are approved.
- [ ] Finalize privacy, terms, and cookie notices with the actual company, vendors, retention, and user rights.
- [ ] Review WCAG 2.2 AA with keyboard and assistive technology at mobile and desktop sizes.
- [ ] Run the stack in a staging environment and verify sign-in, upload limits, ownership boundaries, queue failures/retries, playback, deletion, restore, and rollback.
- [ ] Review current dependency advisories and licenses before each release.

## Verification limits

The local end-to-end happy path now works against the Docker services, but it does not prove cross-account isolation, adversarial upload handling, queue failure recovery, audio deletion, or backup/restore. The studio currently uses a development-only email demo session, and the worker preview only normalizes audio; no production identity, AI processing provider, payment provider, staging environment, monitoring account, or real usage telemetry is configured. The full audit still reports a high-severity development-only `braces` advisory chain; the advisory currently lists no patched version, while `npm audit --omit=dev` reports zero production dependency vulnerabilities. This repository is not production-ready until the unchecked deployment items are completed and verified.
