"""Operational alerts: logged, stored in ops_events, and sent to an optional chat webhook.

Set ALERT_WEBHOOK_URL to a Discord or Slack incoming-webhook URL to be notified. Each alert code
notifies at most once per ALERT_REPEAT_MINUTES (default 60) so an outage doesn't flood the channel.
Messages must never contain audio, prompts, credentials or personal data.
"""
import json
import logging
import os
import threading
import time
from urllib.request import Request, urlopen

import psycopg
import redis

logger = logging.getLogger("fastmix.alerts")


def _send(text: str) -> bool:
    url = os.getenv("ALERT_WEBHOOK_URL", "").strip()
    if not url:
        return False
    # Discord reads "content" and Slack reads "text"; each ignores the other.
    body = json.dumps({"content": text, "text": text}).encode("utf-8")
    try:
        with urlopen(Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST"), timeout=10):
            return True
    except Exception:
        logger.warning("The alert webhook could not be reached")
        return False


def alert(code: str, message: str):
    """Record an operational problem and notify the operator, rate-limited per code. Never raises."""
    logger.error("ALERT %s: %s", code, message)
    repeat_minutes = int(os.getenv("ALERT_REPEAT_MINUTES", "60"))
    try:
        with psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=3) as connection:
            recent = connection.execute(
                "SELECT 1 FROM ops_events WHERE code = %s AND notified AND created_at > now() - make_interval(mins => %s) LIMIT 1",
                (code, repeat_minutes),
            ).fetchone()
            notified = False if recent else _send(f"FastMix alert ({code}): {message}")
            connection.execute("INSERT INTO ops_events (code, message, notified) VALUES (%s, %s, %s)", (code, message[:1000], notified))
    except Exception:
        logger.exception("Could not record alert %s", code)


HEARTBEAT_KEY = "fastmix:processor:heartbeat"


def check_health(connection, queue) -> list[tuple[str, str]]:
    """Problems worth an alert right now, as (code, message) pairs."""
    problems = []
    heartbeat = queue.get(HEARTBEAT_KEY)
    silent_seconds = time.time() - int(heartbeat) if heartbeat else None
    if silent_seconds is None or silent_seconds > int(os.getenv("ALERT_PROCESSOR_SILENT_SECONDS", "120")):
        problems.append(("processor_down", "The processor hasn't checked in " + (f"for {silent_seconds / 60:.0f} minutes." if silent_seconds else "since the queue started.") + " New mixes won't start."))
    backlog_minutes = int(os.getenv("ALERT_QUEUE_MINUTES", "10"))
    oldest = connection.execute(
        "SELECT extract(epoch FROM now() - min(created_at)) / 60 AS minutes, count(*) AS waiting FROM processing_jobs WHERE status = 'queued'"
    ).fetchone()
    if oldest[1] and oldest[0] >= backlog_minutes:
        problems.append(("queue_backlog", f"{oldest[1]} job(s) waiting; the oldest for {oldest[0]:.0f} minutes. Is the processor running?"))
    failed = connection.execute(
        "SELECT count(*) FROM processing_jobs WHERE status = 'failed' AND updated_at > now() - interval '1 hour'"
    ).fetchone()[0]
    spike = int(os.getenv("ALERT_FAILURES_PER_HOUR", "5"))
    if failed >= spike:
        problems.append(("failure_spike", f"{failed} jobs failed in the last hour."))
    return problems


def start_watchdog():
    """Check health every minute in a background thread of the API, which outlives a crashed processor."""
    if os.getenv("ALERT_WATCHDOG", "true").lower() != "true" or not os.getenv("DATABASE_URL") or not os.getenv("REDIS_URL"):
        return

    def run():
        # Give a freshly started stack time to settle before the first check.
        time.sleep(int(os.getenv("ALERT_WATCHDOG_START_SECONDS", "90")))
        while True:
            try:
                queue = redis.Redis.from_url(os.environ["REDIS_URL"], socket_timeout=5, decode_responses=True)
                with psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=3) as connection:
                    problems = check_health(connection, queue)
            except Exception as error:
                problems = [("health_check_failed", f"The health check could not reach the database or queue ({type(error).__name__}).")]
            for code, message in problems:
                alert(code, message)
            time.sleep(60)

    threading.Thread(target=run, name="fastmix-watchdog", daemon=True).start()
