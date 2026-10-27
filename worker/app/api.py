import hmac
import os
import time
from contextlib import asynccontextmanager

import psycopg
import redis
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from .alerts import HEARTBEAT_KEY, start_watchdog
from .uploads import router as uploads_router
from .jobs import router as jobs_router
from .account import router as account_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_watchdog()
    yield


app = FastAPI(title="FastMix API", version="0.1.0", lifespan=lifespan)
app.include_router(uploads_router)
app.include_router(jobs_router)
app.include_router(account_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("WEB_ORIGIN", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
def health() -> dict[str, str]:
    checks = {"api": "ok"}
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        with psycopg.connect(database_url, connect_timeout=2) as connection:
            connection.execute("SELECT 1")
        checks["database"] = "ok"
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        redis.Redis.from_url(redis_url, socket_timeout=2).ping()
        checks["queue"] = "ok"
    return checks


@app.get("/ops/status")
def ops_status(x_internal_secret: str | None = Header(default=None)):
    """Operator view of queue health, recent failures and alerts. Requires the internal secret."""
    expected = os.getenv("INTERNAL_API_SECRET", "")
    if not expected or not x_internal_secret or not hmac.compare_digest(expected, x_internal_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")
    heartbeat = redis.Redis.from_url(os.environ["REDIS_URL"], socket_timeout=2, decode_responses=True).get(HEARTBEAT_KEY)
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row, connect_timeout=3) as connection:
        queue = connection.execute(
            "SELECT count(*) FILTER (WHERE status = 'queued') AS waiting, count(*) FILTER (WHERE status = 'processing') AS processing, "
            "round(extract(epoch FROM now() - min(created_at) FILTER (WHERE status = 'queued')) / 60) AS oldest_waiting_minutes FROM processing_jobs"
        ).fetchone()
        failures = connection.execute(
            "SELECT coalesce(error_code, 'unknown') AS code, count(*) AS jobs FROM processing_jobs WHERE status = 'failed' AND updated_at > now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC"
        ).fetchall()
        completed = connection.execute("SELECT count(*) AS jobs FROM processing_jobs WHERE status = 'completed' AND updated_at > now() - interval '24 hours'").fetchone()["jobs"]
        alerts = connection.execute("SELECT code, message, notified, created_at FROM ops_events ORDER BY created_at DESC LIMIT 20").fetchall()
    return {
        "processorLastSeenSeconds": round(time.time() - int(heartbeat)) if heartbeat else None,
        "queue": queue,
        "last24h": {"completed": completed, "failedByCode": {row["code"]: row["jobs"] for row in failures}},
        "recentAlerts": alerts,
    }
