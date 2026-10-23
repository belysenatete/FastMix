# Project description

## Goal

Build a web application inspired by the Easymix experience: an approachable online studio where artists can upload stems or a finished track, describe the sound they want, request AI-assisted mixing or mastering, and play or download the result. The product should support the public discovery and pricing journey as well as a signed-in workspace for sessions, saved mixes, account management, help, and subscriptions.

Emulate the observed product capabilities and user flows, not Easymix's identity or private implementation. Use original product naming, visual assets, copy, and implementation. The inspected public pages and signed-in pages inform the feature scope. The actual Easymix audio processing engine was not publicly identified or observed; that workflow must be designed and verified independently. The current optional AI processing adapter uses RoEx Tonn for multitrack mix and mastering previews when `ROEX_API_KEY` is configured. Uploaded audio is sent to RoEx for processing. Without that key, the local FFmpeg preview path remains available.

## Feature scope to emulate

### Public marketing and discovery

- English and French language selection.
- Header navigation to Home, Solution, Pricing, and FAQ.
- Hero section that explains the service and provides Get started and Watch the demo actions.
- Demo video with playback controls.
- Short explanation of the mixing workflow: add tracks, describe desired sound, receive a mix.
- AI mixing showcase with audio playback/comparison controls.
- AI mastering section with before/after comparison playback.
- Artist testimonials presented as a carousel with previous/next and pagination controls.
- Social proof/testimonial section with artist quotes and user count.
- Pricing section with monthly and lifetime billing choices, plan cards, and start actions. Exact plans/prices remain a product decision.
- FAQ preview with expandable questions and a route to the full FAQ.
- Bottom call to action to start a session.
- Footer navigation to core pages, product discovery pages, legal pages, and language selection.
- Login entry point and sign-up entry point.

### Authentication

- Login page with Google sign-in and email/password sign-in options.
- Sign-up route for new accounts.
- Authenticated session handling, sign-out, and server-side protection for account data.
- Clear validation, loading, and authentication error states.

### Signed-in application shell

- Persistent sidebar navigation for New session, Library, Become an affiliate, and Help.
- Account menu with Plan & Billing, Settings, Support, language selection, and Sign out.
- Notification opt-in control with a clear permission state.
- Responsive layout and accessible keyboard/focus states.

### Mixing studio

- New-session workspace that invites the artist to add tracks and describe the desired sound.
- Track categories matching observed intent: Beat, Lead vocals, Doubles, Backing vocals, Ad-libs, and Instrument.
- Upload flow for each track category, with per-track name/type, upload progress, validation, errors, and removal.
- Free-text mix direction/prompt field.
- Session/job lifecycle feedback: ready to submit, queued, processing, completed, failed, and retry where supported.
- Completed mix playback and authorized download.
- Output/version history so creating a new mix does not silently erase previous output.
- Mixing and mastering are both product goals. The exact processing engine, supported formats, and limits must be defined during implementation; they were not observable in the authenticated account because no track was uploaded or processed.

### Library

- List a user's saved sessions and completed mixes.
- Search mixes and sort by newest, oldest, name A-Z, or name Z-A.
- Empty state with a Start a new session action.
- Show useful session status and provide actions to open, play, download, retry, or delete when applicable.
- Enforce per-user ownership for all library data and audio.

### Guide and help

- Guide tabs for Prompts, Mastering, and FAQ.
- Copyable style prompt cards. Observed style categories: French rap, Dark drill, Modern French trap, Melodic, Boom bap, Afro trap, RnB, Cloud rap, Phonk, French pop, US drill, and Reggaeton.
- Mastering guide with expandable “How to use mastering” instructions and “Mastering prompt examples”.
- Copyable mastering prompt examples for streaming-ready, club, warm/powerful, vintage, cinematic, and label/producer demo goals.
- FAQ/help topics covering slow processing, phone-sounding vocals, robotic autotune, WAV download, redoing a mix, and missing bass.
- Return-to-studio action and support contact route.

### Affiliate area

- User-specific referral URL with copy action.
- Explain attribution window and first-click behavior; the reference described a 30-day first-click window.
- Referral metrics and period selection where appropriate.
- Earnings estimator with an adjustable referral count and clear assumptions.
- Exact commission, attribution, fraud prevention, eligibility, and payout rules need product decisions before launch.

### Plan and billing

- Monthly and lifetime plan selection with plan descriptions and start actions.
- Account subscription status and invoice history, including useful empty states.
- Payment provider integration, verified webhooks, idempotent subscription updates, and clear success/failure states.
- Exact prices, tax, cancellation, refunds, entitlements, and invoice requirements need product decisions before enabling live payments.

### Settings and support

- General settings: editable profile name, account email display, language, email preferences, and tutorial replay.
- Security settings: current password, new password, confirmation, and password update flow where applicable to the auth method.
- Support page with contact email, expected response information, and FAQ link.
- Do not expose or log account secrets or private user audio.

### Legal and trust pages

- Privacy policy, terms of service, and cookie information linked from the public footer.
- Explain audio ownership, processing, retention, deletion, and use of uploaded material in plain language.
- Publish final legal copy only after the business policies are confirmed.

## Stack direction

- TypeScript, React, and Next.js for public pages and the authenticated web app.
- Python workers for asynchronous audio analysis and processing, communicating through a defined job contract and queue.
- PostgreSQL for accounts, sessions/projects, track metadata, job status, outputs, billing references, and affiliate attribution.
- Private object storage for uploaded tracks and generated audio; store metadata and storage keys in PostgreSQL rather than large audio binaries.
- Provider choices and runtime credentials are tracked separately in [credentials.md](credentials.md); the user maintains that file.

See [phases.md](phases.md) for the implementation sequence and [projectTracker.md](projectTracker.md) for current progress.
