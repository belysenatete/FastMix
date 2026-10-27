import os
import time
import unittest
from unittest import mock

from app import alerts


class FakeQueue:
    def __init__(self, heartbeat):
        self.heartbeat = heartbeat

    def get(self, key):
        return self.heartbeat


class FakeConnection:
    """Answers the two health queries: (oldest queued minutes, waiting jobs) and failures in the last hour."""

    def __init__(self, oldest_minutes, waiting, failed):
        self.rows = [(oldest_minutes, waiting), (failed,)]

    def execute(self, sql, params=None):
        row = self.rows.pop(0)
        return mock.Mock(fetchone=mock.Mock(return_value=row))


class HealthCheckTest(unittest.TestCase):
    def codes(self, heartbeat, oldest_minutes=None, waiting=0, failed=0):
        with mock.patch.dict(os.environ, {}, clear=False):
            return [code for code, _ in alerts.check_health(FakeConnection(oldest_minutes, waiting, failed), FakeQueue(heartbeat))]

    def test_healthy_stack_raises_nothing(self):
        self.assertEqual(self.codes(int(time.time())), [])

    def test_silent_processor(self):
        self.assertEqual(self.codes(int(time.time()) - 600), ["processor_down"])
        self.assertEqual(self.codes(None), ["processor_down"])

    def test_backlog_and_failure_spike(self):
        self.assertEqual(self.codes(int(time.time()), oldest_minutes=25, waiting=3, failed=7), ["queue_backlog", "failure_spike"])


class WebhookTest(unittest.TestCase):
    def test_no_webhook_means_no_request(self):
        with mock.patch.dict(os.environ, {"ALERT_WEBHOOK_URL": ""}), mock.patch.object(alerts, "urlopen") as call:
            self.assertFalse(alerts._send("hello"))
        call.assert_not_called()

    def test_webhook_failure_never_raises(self):
        with mock.patch.dict(os.environ, {"ALERT_WEBHOOK_URL": "https://example.test/hook"}), mock.patch.object(alerts, "urlopen", side_effect=OSError("down")):
            self.assertFalse(alerts._send("hello"))


if __name__ == "__main__":
    unittest.main()
