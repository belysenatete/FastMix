import os

import psycopg
import redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .uploads import router as uploads_router
from .jobs import router as jobs_router
from .account import router as account_router

app = FastAPI(title="FastMix API", version="0.1.0")
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
