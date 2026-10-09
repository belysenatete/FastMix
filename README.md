# FastMix

FastMix is a local-first music mixing studio MVP, inspired by the observed Easymix product flows. It is not affiliated with Easymix. The public and account UI can be explored in demo mode; production authentication, payments, cloud storage, and AI processing require configured providers.

## Stack

- `web/`: Next.js App Router, React, TypeScript
- `worker/`: FastAPI service foundation for Python processing and health checks
- `database/`: PostgreSQL schema
- Local dependencies: PostgreSQL and Redis via Docker Compose

## Local setup

1. Copy `.env.example` to `.env` and change `AUTH_SECRET` before using any non-local deployment. The bundled database password is for local development only.
2. Start local infrastructure: `docker compose up -d db redis`.
3. Start the web app: `cd web && npm install && npm run dev`.
4. Optional API service: `docker compose up --build api` and open `http://localhost:8000/health`.

Do not use the local demo sign-in or development secrets for a production deployment. See `phases.md`, `projectDescription.md`, `projectTracker.md`, and `codingPrinciples.md` for product scope and implementation status.
