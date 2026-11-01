# FastMix

FastMix is a local-first music mixing studio MVP, inspired by the observed Easymix product flows. It is not affiliated with Easymix. Local sign-in uses a Clerk development instance. AI mixing and mastering use RoEx Tonn when its API key is configured; otherwise, preview jobs use the local FFmpeg processor.

## Stack

- `web/`: Next.js App Router, React, TypeScript
- `worker/`: FastAPI service and Python audio processor
- `database/`: PostgreSQL schema
- Local dependencies: PostgreSQL and Redis via Docker Compose

## Local setup

1. Copy `.env.example` to `.env`. Keep local credentials out of version control. The Clerk development keys belong in `web/.env.local`; never copy a Clerk secret into a browser-visible variable.
2. Start local infrastructure and the preview processor: `docker compose up -d --build db redis storage api processor`.
3. Start the web app: `cd web && npm install && npm run dev`.
4. Open `http://localhost:3000` and enter the local preview. MinIO's local console is at `http://localhost:9001`.

To enable RoEx AI mixing and mastering, create a Tonn API account at [tonn-portal.roexaudio.com](https://tonn-portal.roexaudio.com) and request API access (new accounts get 1,000 free credits). Add the key to the ignored root `.env` file as `ROEX_API_KEY=your_key`, then rebuild with `docker compose up -d --build api processor`. Without this key the app uses local FFmpeg. With RoEx enabled, audio is uploaded to RoEx Tonn and each session picks a workflow:

- **One beat + one vocal:** RoEx recombine mixes the vocal onto the beat and masters it, with genre styles such as trap, afrobeat and reggaeton.
- **Two or more stems:** RoEx multitrack mix, then local two-pass loudness finishing.
- **One finished track (Master mode):** RoEx mastering.

Every job starts with a free 30-second preview (free while the account has a positive credit balance). The full-length track is rendered only when the user clicks **Get full track** and costs about 220–250 credits ($1.76–$2.50) once per version; the paid result URL is saved so retries never pay twice. Do not enable automatic credit top-ups unless you intend to pay for them. See [Tonn's security and data handling notes](https://tonn-portal.roexaudio.com/security-and-data-handling) before sending private or unreleased tracks.

**Autotune** runs locally in the worker (no RoEx credits) whenever a mix direction asks for it, before either engine processes the vocals. "subtle/natural" applies light correction, "hard/robotic" gives the locked effect, and a key such as "in A minor" or "en la mineur" keeps notes in that scale; "no autotune" turns it off. It uses Praat's PSOLA through `praat-parselmouth` (GPL-3.0, used server-side only) and takes about 20 seconds per 3-minute vocal.

**Refinement:** every version stores the settings that produced it (style, loudness, vocal level, vocal reverb, autotune), shown in the mixer and library. After a version finishes, type a note such as "vocal louder, more reverb", "harder autotune in A minor", "more dynamic" or "make it afro" to create a new version; earlier versions are kept. Notes are read by keyword (English and French), and a note with no recognizable change is rejected with examples rather than ignored. The local engine applies vocal level, a basic echo-style reverb, autotune and loudness, so refinements are audible even without RoEx.

The landing page's before/after demo (`web/public/demo/`) is rendered from original synthesized tracks by `worker/scripts/make_demo_audio.py`; replace it with licensed real recordings when available. Regenerate it with `docker compose run --rm -v ./worker/scripts:/srv/fastmix/scripts:ro -v ./web/public/demo:/out --no-deps api python -m scripts.make_demo_audio /out` (in Git Bash, set `MSYS_NO_PATHCONV=1` first).

Worker unit tests run inside the API image: `docker compose run --rm -v ./worker/tests:/srv/fastmix/tests:ro --no-deps api python -m unittest discover -s tests`.

Audio uploads require the Compose API and private object storage. See `phases.md`, `projectDescription.md`, `projectTracker.md`, and `codingPrinciples.md` for product scope and implementation status.

## Deploying to Railway

Hosting is Railway, described in code in [.railway/railway.ts](.railway/railway.ts): `web` (Next.js, built with Railpack from `web/`), `api` (FastAPI), `processor` (the job worker, same image as `api`), Postgres, Redis and an `audio` storage bucket. The worker image builds from the repository root so it can carry `database/`; before each `api` deploy Railway runs `python -m app.release`, which applies `init.sql` and every migration (all idempotent) and sets the bucket's CORS rule for the website. Only `web` should get a public domain; `api` is reached over Railway's private network.

First deploy:

1. Install the [Railway CLI](https://docs.railway.com/cli), then `railway login`, and `railway link` to a new empty project. Connect the GitHub repository to Railway when asked.
2. In the project's **Shared Variables**, add `INTERNAL_API_SECRET` with a new long random value (for example `openssl rand -hex 32`) and seal it.
3. `cd .railway && npm install && npm run check`, then `railway config plan` to review and `railway config apply` to create everything.
4. In the dashboard, set the secrets the config keeps with `preserve()`: on `web`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the Clerk **production** instance; on `processor`, `ROEX_API_KEY`; and optionally `ALERT_WEBHOOK_URL` on all three services. Seal each one.
5. On `web`, **Settings → Networking → Generate Domain** (or add your own domain), then redeploy `api` so `WEB_ORIGIN` and the bucket CORS rule pick it up. Add the same domain to the Clerk production instance.
6. Open the site, sign in, upload a track and run a preview to confirm the whole path works.

Later changes to `.railway/railway.ts` go through `railway config plan` and `railway config apply`; code changes deploy on every push to `main`. Railway's buckets have no versioning or lifecycle rules, and `scripts/backup.sh` only covers the local Compose stack, so turn on Railway's Postgres backups and plan a separate copy of the bucket.

## Backups

Run these from the repository root with the Compose stack running (Git Bash on Windows).

- `scripts/backup.sh` saves the database (`db.dump`) and every stored audio file (`audio/`) to `backups/<UTC timestamp>/` and keeps the newest 14 (`KEEP=30 scripts/backup.sh` to change). Schedule it daily, for example with Windows Task Scheduler or cron, and copy `backups/` to another machine or cloud storage: a backup on the same disk doesn't survive that disk failing.
- `scripts/restore-check.sh [backups/<stamp>]` proves a backup is usable without touching live data. It restores the dump into a scratch database, compares row counts with the live database, and checks that every audio file the database points to is in the backup.
- `scripts/restore.sh backups/<stamp> --yes` is the disaster-recovery restore. It stops the API and processor, **replaces** the live database and audio bucket with the backup, and starts them again. For a drill, point it at scratch copies: `TARGET_DB=fastmix_drill TARGET_BUCKET=fastmix-drill scripts/restore.sh backups/<stamp> --yes`.

## Monitoring and alerts

- **Alerts.** Set `ALERT_WEBHOOK_URL` to a Discord or Slack incoming-webhook URL, in the root `.env` for the API and processor and in `web/.env.local` for the website. FastMix posts there when RoEx runs out of credits or rejects the key, the processor stops checking in, jobs wait more than 10 minutes, 5 or more jobs fail in an hour, a job crashes unexpectedly, or the website hits a server error. Each kind of alert posts at most once an hour. Alerts never include audio, prompts, cookies or credentials.
- **Status.** `curl -H "X-Internal-Secret: <INTERNAL_API_SECRET>" http://127.0.0.1:8000/ops/status` shows when the processor last checked in, the queue, the last 24 hours of completed and failed jobs, and the 20 most recent alerts (also kept in the `ops_events` table).
- **Logs.** `docker compose logs api processor` for the worker; the website logs server errors as one JSON line each (`"event":"request_error"`).

## Dependencies and licenses

Reviewed 2026-10-27: `npm audit` and `pip-audit` (run in a separate environment against the worker image) report no known vulnerabilities. Website production packages are MIT, Apache-2.0, BSD, ISC and similar; `sharp`'s image library is LGPL-3.0. The worker uses `praat-parselmouth` (GPL-3.0) for autotune and `psycopg` (LGPL-3.0). Running them on your own servers is fine; if the worker is ever distributed to customers (for example as a desktop app or a Docker image), its source must be offered under the GPL. Re-run both audits before each release.
