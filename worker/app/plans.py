"""Plan entitlements and the usage ledger.

Keep PLANS in step with web/src/lib/plans.ts, which shows the same numbers to visitors.
"""
import os
import uuid

from fastapi import HTTPException

PLANS = {
    "starter": {"name": "Starter", "full_tracks": 0, "formats": ()},
    "pro": {"name": "Pro", "full_tracks": 6, "formats": ("mp3",)},
    "artist": {"name": "Artist", "full_tracks": 10, "formats": ("mp3", "wav")},
}
ACTIVE_SUBSCRIPTION = ("active", "trialing", "past_due")


def previews_per_day() -> int:
    """Fair-use cap on free previews, so one account can't drain the provider balance."""
    return int(os.getenv("FASTMIX_PREVIEWS_PER_DAY", "40"))


def default_plan() -> str:
    plan = os.getenv("FASTMIX_DEFAULT_PLAN", "starter").strip().lower()
    return plan if plan in PLANS else "starter"


def plan_for(connection, user_id: uuid.UUID) -> str:
    """The plan of the user's newest current subscription, or the default plan."""
    row = connection.execute(
        "SELECT plan_key FROM subscriptions WHERE user_id = %s AND status = ANY(%s) AND (period_end IS NULL OR period_end > now()) ORDER BY created_at DESC LIMIT 1",
        (user_id, list(ACTIVE_SUBSCRIPTION)),
    ).fetchone()
    plan = row["plan_key"] if row else default_plan()
    return plan if plan in PLANS else "starter"


def _count(connection, user_id: uuid.UUID, kind: str, since_sql: str) -> int:
    return connection.execute(
        f"SELECT count(*) AS total FROM usage_events WHERE user_id = %s AND kind = %s AND created_at >= {since_sql}",
        (user_id, kind),
    ).fetchone()["total"]


def full_tracks_used(connection, user_id: uuid.UUID) -> int:
    return _count(connection, user_id, "full_track", "date_trunc('month', now())")


def previews_used(connection, user_id: uuid.UUID) -> int:
    return _count(connection, user_id, "preview", "now() - interval '24 hours'")


def usage_summary(connection, user_id: uuid.UUID | None) -> dict:
    plan_key = plan_for(connection, user_id) if user_id else default_plan()
    plan = PLANS[plan_key]
    reset = connection.execute("SELECT date_trunc('month', now()) + interval '1 month' AS reset").fetchone()["reset"]
    return {
        "plan": plan_key,
        "planName": plan["name"],
        "formats": list(plan["formats"]),
        "fullTracks": {"used": full_tracks_used(connection, user_id) if user_id else 0, "limit": plan["full_tracks"], "resetsAt": reset.isoformat()},
        "previews": {"used": previews_used(connection, user_id) if user_id else 0, "limit": previews_per_day()},
    }


def _lock_user(connection, user_id: uuid.UUID):
    # Serializes concurrent requests from one account so a limit can't be overshot.
    connection.execute("SELECT id FROM users WHERE id = %s FOR UPDATE", (user_id,))


def claim_preview(connection, user_id: uuid.UUID, job_id: uuid.UUID):
    _lock_user(connection, user_id)
    limit = previews_per_day()
    if previews_used(connection, user_id) >= limit:
        raise HTTPException(status_code=429, detail=f"You've made {limit} previews in the last 24 hours, the fair-use limit. Try again a little later.")
    connection.execute("INSERT INTO usage_events (user_id, job_id, kind) VALUES (%s, %s, 'preview') ON CONFLICT DO NOTHING", (user_id, job_id))


def claim_full_track(connection, user_id: uuid.UUID, job_id: uuid.UUID):
    _lock_user(connection, user_id)
    plan = PLANS[plan_for(connection, user_id)]
    if plan["full_tracks"] == 0:
        raise HTTPException(status_code=402, detail="Full-length tracks come with the Pro and Artist plans. Previews stay free.")
    if full_tracks_used(connection, user_id) >= plan["full_tracks"]:
        raise HTTPException(status_code=402, detail=f"You've used all {plan['full_tracks']} full-length tracks on your {plan['name']} plan this month. They reset on the 1st.")
    connection.execute("INSERT INTO usage_events (user_id, job_id, kind) VALUES (%s, %s, 'full_track') ON CONFLICT DO NOTHING", (user_id, job_id))


def release(connection, job_id: uuid.UUID):
    """Give back what a failed job used. Retrying claims it again."""
    connection.execute("DELETE FROM usage_events WHERE job_id = %s", (job_id,))
