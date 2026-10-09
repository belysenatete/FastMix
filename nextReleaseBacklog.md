# Next release backlog

## Evidence available

There is no deployed service, production account, staging environment, or product telemetry yet. This backlog is based on repository review, the observed Easymix flows, and implementation gaps recorded in `projectTracker.md`; it does not claim to reflect measured user behavior. Re-rank these items after collecting privacy-respecting usage and support feedback.

## Prioritized work

### P0 — Make a real release possible

1. **Choose and integrate production identity.** Replace the local email-only demo session, add account lifecycle and verified identity, then verify owner isolation on project, track, job, and output routes.
   - Evidence: local demo sign-in is intentionally disabled in production; no production identity provider is configured.
   - Signal: successful and failed sign-ins, recovery completion, and authorization-denial counts, without recording credentials or tokens.
2. **Prove audio lifecycle in staging.** Run upload, type/size rejection, queued processing, retry, authorized playback/download, project deletion, and object cleanup against the real database, queue, and private storage.
   - Evidence: Docker runtime was unavailable during local review, so these service boundaries are unverified.
   - Signal: upload acceptance/rejection, queue wait, processing duration/failure code, storage error, and deletion completion.
3. **Close the dependency advisory.** Resolve the high severity `braces` advisory in the development lint dependency tree without downgrading the Next.js toolchain; audit the complete lockfile again.
   - Evidence: `npm audit --omit=dev` reports zero production vulnerabilities, while full `npm audit` reports five linked high-severity development-tree findings through `eslint-config-next` and `braces` (GHSA-vfj7-8cjw-p6xm). A non-forced `npm audit fix` did not change the tree; npm proposes a breaking downgrade.
4. **Finalize privacy and commercial rules.** Confirm audio retention/deletion, company/vendor disclosures, published support address, pricing/tax/refund/cancellation, affiliate attribution and fraud controls before enabling those flows.
   - Evidence: the current billing and affiliate screens are intentionally informational previews.

### P1 — Learn from the first preview cohort

5. **Instrument operational health with privacy limits.** Add dashboards for queue age, job success/failure, worker restarts, upload/storage errors, and deletion lag. Do not log file contents, raw prompts, session cookies, or secret values.
   - Review after the first week of opted-in staging/preview use.
6. **Collect workflow friction.** Add a short optional feedback prompt after a completed or failed preview. Ask whether users could upload, describe the sound, understand the result, and find/download a version.
   - Review themes and completion rates after the first 20–50 opted-in sessions; treat the sample as directional.
7. **Check responsive and assistive use.** Observe keyboard-only and screen-reader use of upload, job status, version playback, errors, and help at narrow and wide viewport sizes.
   - Evidence to collect: task completion, blockers, and accessibility issues; do not infer success from a successful build.

### P2 — Validate product capabilities before expanding

8. **Validate processing quality with artists.** Compare FFmpeg preview expectations against a properly selected mixing/mastering engine; the current worker only combines and normalizes audio and is not an AI mix.
9. **Prioritize help content from support themes.** Use repeated questions and failed task observations to refine the sound guide rather than expanding examples speculatively.
10. **Enable referrals and billing only after economics and lifecycle rules are approved.** Validate provider webhook retries, idempotency, refunds, cancellation, attribution, fraud handling, and payout reconciliation in a sandbox first.

## Reprioritization rule

At the next review, add the observation period, sample size, top task failures, processing latency percentiles, support themes, and privacy limitations. Promote work based on user impact and risk; do not treat empty analytics or a small sample as evidence that a workflow works well.
