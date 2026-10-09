# FastMix

FastMix is a local-first music mixing studio MVP, inspired by the observed Easymix product flows. It is not affiliated with Easymix. The public and account UI can be explored in demo mode; production authentication, payments, cloud storage, and AI processing require configured providers.

## Stack

- `web/`: Next.js App Router, React, TypeScript
- `worker/`: FastAPI service foundation for Python processing and health checks
- `database/`: PostgreSQL schema
- Local dependencies: PostgreSQL and Redis via Docker Compose

## Local setup

1. Copy `.env.example` to `.env` and `web/.env.local`; change `AUTH_SECRET` and `INTERNAL_API_SECRET` before using anything outside this local preview. Bundled service passwords are local-only.
2. Start local infrastructure: `docker compose up -d db redis storage api`.
3. Start the web app: `cd web && npm install && npm run dev`.
4. Open `http://localhost:3000` and enter the local preview. MinIO's local console is at `http://localhost:9001`.

Do not use the local demo sign-in or development secrets for a production deployment. Audio uploads require the Compose API and private MinIO bucket. See `phases.md`, `projectDescription.md`, `projectTracker.md`, and `codingPrinciples.md` for product scope and implementation status.
