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

To enable RoEx AI previews, create a Tonn API account and request API access, then add its key to the ignored root `.env` file as `ROEX_API_KEY=your_key`, then rebuild the API and processor with `docker compose up -d --build api processor`. Without this key the app uses local FFmpeg. RoEx preview mode uploads audio to RoEx Tonn for processing; mixing previews request no billable full-length mix, and mastering previews are 30 seconds. The API key must belong to an account with a positive credit balance for previews. Do not enable automatic credit top-ups unless you intend to pay for them. RoEx final-mix retrieval is not enabled in the app. See [Tonn's security and data handling notes](https://tonn-portal.roexaudio.com/security-and-data-handling) before sending private or unreleased tracks.

Audio uploads require the Compose API and private object storage. See `phases.md`, `projectDescription.md`, `projectTracker.md`, and `codingPrinciples.md` for product scope and implementation status.
