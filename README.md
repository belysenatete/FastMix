# FastMix

FastMix is a local-first music mixing studio MVP, inspired by the observed Easymix product flows. It is not affiliated with Easymix. Local sign-in uses a Clerk development instance. AI mixing and mastering use RoEx Tonn when its API key is configured; otherwise, preview jobs use the local FFmpeg processor.

## Stack

- `web/`: Next.js App Router, React, TypeScript
- `worker/`: FastAPI service and Python audio processor
- `database/`: PostgreSQL schema
- Local dependencies: PostgreSQL, Redis and S3-compatible storage via Docker Compose

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

## Deploying

Everything runs in the Vercel project `fast-mix`, set up in [vercel.json](vercel.json), and deploys on every push to `main`:

- **`web` service:** the website (`web/`). It reaches the API through the `WORKER_API_URL` binding and is the only public part.
- **`worker` service:** the worker API (`worker/`, FastAPI as a Vercel function).
- **`processor` daemon (beta):** the job processor, built from `worker/Dockerfile` with the repository root as context, one 1 GB instance in `iad1`. On start it runs `python -m app.release`, which applies `init.sql` and every migration (all idempotent) and sets the bucket's CORS rule, then the processor. It makes the MP3 copy of each full track and runs the alert watchdog, since Vercel functions can't keep a background thread. Hobby includes 5 hours of daemon CPU and 420 GB-hours of memory a month; one 1 GB instance running all month uses about 730 GB-hours, so expect it to stop partway through the month on Hobby. Check usage under the project's **Usage** tab, or `vercel daemons ls` with the CLI.
- **Postgres, Redis and S3-compatible storage** are hosted elsewhere; the services and the daemon share the project's `DATABASE_URL`, `REDIS_URL` and `S3_*` values.

Audio never passes through Vercel (its requests are capped at 4.5 MB): the browser asks the API for a 15-minute signed link, uploads the file straight to the bucket, then the API checks its size and file signature and adds it to the session, deleting anything that fails. Downloads and playback also use signed links. So the bucket must allow the website's origin to `PUT` and `GET`: set `S3_CORS_ORIGINS` and `app.release` applies it, or set the rule in the storage provider's dashboard if it doesn't accept CORS changes through the S3 API. Set `S3_ADDRESSING_STYLE=virtual` if your provider rejects path-style URLs.

Settings:

| Group | Variables (all Production environment variables in the Vercel project) |
|---|---|
| Shared | `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `INTERNAL_API_SECRET` |
| Website | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (Clerk **production** instance) |
| API | `WEB_ORIGIN` (the site's address), `ROEX_ENABLED=true` |
| Processor | `ROEX_API_KEY`, `S3_CORS_ORIGINS` (the site's address) |
| Optional | `S3_PUBLIC_ENDPOINT_URL`, `S3_ADDRESSING_STYLE`, `ALERT_WEBHOOK_URL` |

Changing a variable takes effect on the next deploy; redeploy to restart the processor with new values.

Vercel's free Hobby plan is for non-commercial use; move to Pro before taking payments. Turn off **Deployment Protection → Vercel Authentication** (or add a custom domain) so visitors don't get a Vercel sign-in page. `scripts/backup.sh` only covers the local Compose stack; turn on your database provider's backups and plan a copy of the bucket.

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
