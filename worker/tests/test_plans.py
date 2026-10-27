import os
import unittest
import uuid
from unittest import mock

from fastapi import HTTPException

from app import plans

try:
    import psycopg
    from psycopg.rows import dict_row
    CONNECTION = psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row, connect_timeout=3)
except Exception:  # The ledger needs PostgreSQL; skip when it isn't reachable.
    CONNECTION = None


@unittest.skipIf(CONNECTION is None, "PostgreSQL is not available")
class PlanLedgerTest(unittest.TestCase):
    """Runs against the real schema inside a transaction that is always rolled back."""

    def setUp(self):
        self.connection = CONNECTION
        self.user = self.connection.execute(
            "INSERT INTO users (email, auth_provider, clerk_user_id) VALUES (%s, 'clerk', %s) RETURNING id",
            (f"plan-test-{uuid.uuid4()}@example.test", f"plan_test_{uuid.uuid4()}"),
        ).fetchone()["id"]
        patcher = mock.patch.dict(os.environ, {"FASTMIX_DEFAULT_PLAN": "starter", "FASTMIX_PREVIEWS_PER_DAY": "3"})
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.connection.rollback)

    def subscribe(self, plan, status="active"):
        self.connection.execute(
            "INSERT INTO subscriptions (user_id, provider, plan_key, status, period_end) VALUES (%s, 'manual', %s, %s, now() + interval '30 days')",
            (self.user, plan, status),
        )

    def assert_blocked(self, claim, status):
        with self.assertRaises(HTTPException) as caught:
            claim(self.connection, self.user, uuid.uuid4())
        self.assertEqual(caught.exception.status_code, status)

    def test_starter_has_no_full_tracks(self):
        self.assert_blocked(plans.claim_full_track, 402)

    def test_monthly_allowance_and_release(self):
        self.subscribe("pro")
        jobs = [uuid.uuid4() for _ in range(plans.PLANS["pro"]["full_tracks"])]
        for job in jobs:
            plans.claim_full_track(self.connection, self.user, job)
        self.assert_blocked(plans.claim_full_track, 402)
        plans.release(self.connection, jobs[0])
        plans.claim_full_track(self.connection, self.user, uuid.uuid4())

    def test_preview_fair_use(self):
        for _ in range(3):
            plans.claim_preview(self.connection, self.user, uuid.uuid4())
        self.assert_blocked(plans.claim_preview, 429)

    def test_expired_subscription_falls_back(self):
        self.subscribe("artist", status="expired")
        self.assertEqual(plans.plan_for(self.connection, self.user), "starter")
        summary = plans.usage_summary(self.connection, self.user)
        self.assertEqual((summary["plan"], summary["fullTracks"]["limit"]), ("starter", 0))


if __name__ == "__main__":
    unittest.main()
