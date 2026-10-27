# Release readiness checklist

This checklist reflects the current local preview. A checked code item does not mean the application has been deployed or its external providers are live.

## Repository checks

- [x] Production web dependencies have no advisories in `npm audit --omit=dev` (2026-10-23, after upgrading `next` and `eslint-config-next` 16.4.0 → 16.4.2 for GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr and GHSA-p3m5-59mp-jv5r; lint, type check and build pass).
- [x] Backend integration checks (auth boundary, ownership isolation, upload limits, job failure/retry, processor/Redis outage, deletion cleanup) passed against the local Compose stack on 2026-10-23.
- [x] ESLint reports no errors or warnings.
- [x] TypeScript check and optimized Next.js build pass.
- [x] Docker Compose configuration parses.
- [x] Local database, Redis, MinIO, and API ports bind to loopback only.
- [x] Uploads enforce per-file, per-project total-size, and per-project track-count limits on the server.
- [x] Track edits and project deletion coordinate with active jobs using project-row locks.
- [x] Baseline browser security headers are configured; HSTS is emitted for production builds.
- [x] Local demo authentication is disabled in production.
- [x] Studio request-time session validation is kept out of prerendering; landing waveform is hydration-stable.
- [x] Local browser workflow verified: Clerk development sign-in, track upload, queued FFmpeg preview, playback, and WAV download; the temporary test project was deleted afterward.
- [x] RoEx Tonn live-tested on 2026-10-24 with the production key: vocal + beat recombine preview, refinement, and one paid full-track WAV. Multitrack mix and mastering previews were live-tested the same day; all RoEx outputs are limited to ≤ −1 dBTP. Provider mode uploads user audio to RoEx; complete vendor review before production.
- [x] Invalid audio content with a `.wav` filename was rejected by the upload API with HTTP 415.
- [x] Mixer and library layouts have no horizontal overflow at a 390 px viewport; keyboard tab focus is visible.
- [ ] Full dependency audit is clear. Reviewed 2026-10-10: `npm audit --omit=dev` reports zero production vulnerabilities. The full audit reports five findings in the development-only ESLint dependency chain, all through `braces`; its [upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) currently lists no patched version. Do not force the suggested major Next.js lint-config downgrade; recheck for a compatible upstream fix before release.

## Required before any production deployment

- [ ] Integrate a production identity provider and enforce authenticated ownership on every account and media route.
- [ ] Set unique production secrets in a secret manager. Do not reuse values from `.env.example` or local Compose defaults.
- [ ] Use HTTPS, private network policies, and managed PostgreSQL, Redis, and object storage with least-privilege service identities.
- [ ] Configure storage lifecycle/retention, verify audio deletion, and document data processing and backup retention.
- [ ] Define and test database backups, restore, migration rollback, and disaster recovery. Backup, restore check and restore drill scripts written and verified locally on 2026-10-27; still needed: a daily schedule, off-machine copies, and migration rollback steps.
- [ ] Configure structured operational logs, error reporting, queue/worker metrics, alerts, and retention without logging private audio or credentials. Built-in alerts, watchdog and `/ops/status` added 2026-10-27; still needed: a real webhook URL, log retention on the host, and optionally a hosted error tracker.
- [ ] Add verified payment webhooks only after pricing, tax, refund, cancellation, and entitlement behavior are approved.
- [ ] Finalize privacy, terms, and cookie notices with the actual company, vendors, retention, and user rights. Drafts written 2026-10-26 (operator Nexora LLC); still need real support/privacy inboxes, the operator's state of organization, RoEx data-handling confirmation, and legal review.
- [ ] Review WCAG 2.2 AA with keyboard and assistive technology at mobile and desktop sizes.
- [ ] Run the stack in a staging environment and verify sign-in, upload limits, ownership boundaries, queue failures/retries, playback, deletion, restore, and rollback.
- [ ] Review current dependency advisories and licenses before each release.

## Verification limits

The local end-to-end happy path now works against the Docker services. Clerk development authentication and cross-account ownership checks were verified locally. The latest browser run covered project creation, WAV upload, queue processing, playback, download, and deletion of the temporary test project. It does not prove adversarial upload handling, queue failure recovery, data restore, or production operations. With no RoEx API key configured, the worker uses its local FFmpeg normalization preview, which is not AI mixing or mastering. The optional RoEx Tonn AI mix/master preview adapter is implemented but has not been exercised against the external provider. No production Clerk instance/domain, payment provider, staging environment, monitoring account, or real usage telemetry is configured. The full audit still reports a high-severity development-only `braces` advisory chain; the advisory currently lists no patched version, while `npm audit --omit=dev` reports zero production dependency vulnerabilities. This repository is not production-ready until the unchecked deployment items are completed and verified.
