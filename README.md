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

## Backups

Run these from the repository root with the Compose stack running (Git Bash on Windows).

- `scripts/backup.sh` saves the database (`db.dump`) and every stored audio file (`audio/`) to `backups/<UTC timestamp>/` and keeps the newest 14 (`KEEP=30 scripts/backup.sh` to change). Schedule it daily, for example with Windows Task Scheduler or cron, and copy `backups/` to another machine or cloud storage: a backup on the same disk doesn't survive that disk failing.
- `scripts/restore-check.sh [backups/<stamp>]` proves a backup is usable without touching live data. It restores the dump into a scratch database, compares row counts with the live database, and checks that every audio file the database points to is in the backup.
- `scripts/restore.sh backups/<stamp> --yes` is the disaster-recovery restore. It stops the API and processor, **replaces** the live database and audio bucket with the backup, and starts them again. For a drill, point it at scratch copies: `TARGET_DB=fastmix_drill TARGET_BUCKET=fastmix-drill scripts/restore.sh backups/<stamp> --yes`.
