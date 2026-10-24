import io
import os
import unittest
from pathlib import Path
from unittest import mock
from urllib.error import HTTPError

from app import roex
from app.direction import settings_from_prompt


def track(category: str) -> dict:
    return {"category": category, "storage_key": f"{category}.wav", "original_name": f"{category}.wav"}


class FakeApi:
    """Replays scripted (status, body) responses per endpoint and records each call."""

    def __init__(self, responses: dict[str, list[tuple[int, dict]]]):
        self.responses = {path: list(items) for path, items in responses.items()}
        self.calls: list[tuple[str, dict | None, str]] = []

    def __call__(self, path, payload=None, method="POST"):
        self.calls.append((path, payload, method))
        return self.responses[path].pop(0)

    def paths(self):
        return [path for path, _, _ in self.calls]


class PlanAndPromptTests(unittest.TestCase):
    def test_plan_selects_workflow_from_tracks(self):
        self.assertEqual(roex.plan({"project_type": "master", "tracks": [track("master")]}), "master")
        self.assertEqual(roex.plan({"project_type": "mix", "tracks": [track("beat"), track("lead_vocal")]}), "recombine")
        self.assertEqual(roex.plan({"project_type": "mix", "tracks": [track("adlibs"), track("beat")]}), "recombine")
        self.assertEqual(roex.plan({"project_type": "mix", "tracks": [track("beat"), track("lead_vocal"), track("adlibs")]}), "multitrack")
        self.assertEqual(roex.plan({"project_type": "mix", "tracks": [track("instrument"), track("lead_vocal")]}), "multitrack")


class ApiErrorTests(unittest.TestCase):
    def test_missing_key_is_reported_as_not_configured(self):
        with mock.patch.dict(os.environ, {"ROEX_API_KEY": ""}):
            with self.assertRaises(roex.RoExError) as raised:
                roex._api_request("/health", method="GET")
        self.assertEqual(raised.exception.code, "provider_not_configured")

    def test_http_errors_map_to_safe_codes(self):
        for status, code in [(402, "provider_credits"), (401, "provider_auth"), (500, "provider_failed")]:
            error = HTTPError("https://tonn.roexaudio.com/x", status, "error", {}, io.BytesIO(b"provider detail"))
            with mock.patch.dict(os.environ, {"ROEX_API_KEY": "test-key"}), mock.patch.object(roex, "urlopen", side_effect=error):
                with self.assertRaises(roex.RoExError) as raised:
                    roex._api_request("/retrieverecombine", {})
            self.assertEqual(raised.exception.code, code)
            self.assertNotIn("provider detail", str(raised.exception))


@mock.patch.object(roex, "POLL_SECONDS", 0)
class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.workdir = Path("/tmp")
        patches = [
            mock.patch.object(roex, "_prepare_track"),
            mock.patch.object(roex, "_upload", side_effect=lambda path: f"https://roex.test/{path.name}"),
            mock.patch.object(roex, "_download", side_effect=lambda url, workdir: (workdir / "out.mp3", "mp3")),
        ]
        for patcher in patches:
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_vocal_and_beat_use_recombine(self):
        api = FakeApi({
            "/recombine": [(200, {"recombineTaskId": "rc_1", "error": False})],
            "/recombinestatus/rc_1": [(202, {}), (200, {"status": "complete"})],
            "/retrieverecombinepreview": [(202, {}), (200, {"preview": {"preview_url": "https://roex.test/preview.mp3"}})],
        })
        job = {"project_type": "mix", "settings": settings_from_prompt("dark drill, vocals upfront, loud"), "tracks": [track("lead_vocal"), track("beat")]}
        with mock.patch.object(roex, "_api_request", api):
            output, output_format, provider_data = roex.create_preview(job, [Path("a"), Path("b")], self.workdir, lambda _: None)
        payload = api.calls[0][1]["recombineData"]
        self.assertEqual(payload["vocalStemURL"], "https://roex.test/roex-track-0.wav")
        self.assertEqual(payload["backingStemURL"], "https://roex.test/roex-track-1.wav")
        self.assertEqual((payload["musicalStyle"], payload["desiredLoudness"], payload["vocalGainDb"]), ("TRAP", "HIGH", 2.0))
        self.assertEqual(api.calls[1][2], "GET")
        self.assertNotIn("/retrieverecombine", api.paths(), "a preview must never request the paid render")
        self.assertEqual(provider_data, {"workflow": "recombine", "task_id": "rc_1"})
        self.assertEqual(output_format, "mp3")

    def test_failed_recombine_is_reported_as_invalid_audio(self):
        api = FakeApi({
            "/recombine": [(200, {"recombineTaskId": "rc_2"})],
            "/recombinestatus/rc_2": [(200, {"status": "failed", "error": True})],
        })
        job = {"project_type": "mix", "settings": settings_from_prompt(""), "tracks": [track("beat"), track("lead_vocal")]}
        with mock.patch.object(roex, "_api_request", api), self.assertRaises(roex.RoExError) as raised:
            roex.create_preview(job, [Path("a"), Path("b")], self.workdir, lambda _: None)
        self.assertEqual(raised.exception.code, "invalid_audio")

    def test_multitrack_preview_is_loudness_finished_and_keeps_track_urls(self):
        api = FakeApi({
            "/mixpreview": [(200, {"multitrack_task_id": "mt_1"})],
            "/retrievepreviewmix": [(200, {"previewMixTaskResults": {"status": "MIX_TASK_PREVIEW_COMPLETED", "download_url_preview_mixed": "https://roex.test/mix.wav"}})],
        })
        job = {"project_type": "mix", "settings": settings_from_prompt("lush pop"), "tracks": [track("beat"), track("lead_vocal"), track("backing_vocals")]}
        with mock.patch.object(roex, "_api_request", api), mock.patch.object(roex, "finish_loudness", side_effect=lambda source, target, lufs: target) as finish:
            output, output_format, provider_data = roex.create_preview(job, [Path("a"), Path("b"), Path("c")], self.workdir, lambda _: None)
        tracks = api.calls[0][1]["multitrackData"]["trackData"]
        self.assertEqual([item["presenceSetting"] for item in tracks], ["NORMAL", "LEAD", "BACKGROUND"])
        self.assertEqual(tracks[1]["reverbPreference"], "HIGH")
        self.assertEqual(provider_data["track_urls"], [item["trackURL"] for item in tracks])
        self.assertEqual(output_format, "wav")
        self.assertEqual(finish.call_args.args[2], -11.0)

    def test_multitrack_sends_sample_rate_as_string(self):
        api = FakeApi({
            "/mixpreview": [(200, {"multitrack_task_id": "mt_2"})],
            "/retrievepreviewmix": [(200, {"previewMixTaskResults": {"download_url_preview_mixed": "https://roex.test/mix.wav"}})],
        })
        job = {"project_type": "mix", "settings": settings_from_prompt("pop"), "tracks": [track("beat"), track("lead_vocal"), track("adlibs")]}
        with mock.patch.object(roex, "_api_request", api), mock.patch.object(roex, "finish_loudness", side_effect=lambda source, target, lufs: target):
            roex.create_preview(job, [Path("a"), Path("b"), Path("c")], self.workdir, lambda _: None)
        self.assertEqual(api.calls[0][1]["multitrackData"]["sampleRate"], "44100")

    def test_development_key_placeholder_tasks_are_refused(self):
        cases = [
            ({"project_type": "mix", "tracks": [track("beat"), track("lead_vocal")]}, "/recombine", {"recombineTaskId": "rc_x", "error": False, "message": "Successfully created dev recombine task (dummy)."}),
            ({"project_type": "master", "tracks": [track("master")]}, "/masteringpreview", {"mastering_task_id": "ms_x", "message": "Successfully created dev preview mastering task (dummy)."}),
            ({"project_type": "mix", "tracks": [track("beat"), track("lead_vocal"), track("adlibs")]}, "/mixpreview", {"multitrack_task_id": "mt_x", "message": "Successfully created dev preview mix task (dummy)."}),
        ]
        for job, path, created in cases:
            api = FakeApi({path: [(200, created)]})
            job = {**job, "settings": settings_from_prompt("trap")}
            with mock.patch.object(roex, "_api_request", api), self.assertRaises(roex.RoExError) as raised:
                roex.create_preview(job, [Path(str(index)) for index in range(len(job["tracks"]))], self.workdir, lambda _: None)
            self.assertEqual(raised.exception.code, "provider_dev_key", path)
            self.assertEqual(api.paths(), [path], "no result is fetched for a placeholder task")

    def test_master_never_sends_orchestral(self):
        api = FakeApi({
            "/masteringpreview": [(200, {"mastering_task_id": "ms_1"})],
            "/retrievepreviewmaster": [(200, {"previewMasterTaskResults": {"download_url_mastered_preview": "https://roex.test/m.wav"}})],
        })
        job = {"project_type": "master", "settings": settings_from_prompt("cinematic orchestral"), "tracks": [track("master")]}
        with mock.patch.object(roex, "_api_request", api):
            roex.create_preview(job, [Path("a")], self.workdir, lambda _: None)
        self.assertEqual(api.calls[0][1]["masteringData"]["musicalStyle"], "OTHER")


@mock.patch.object(roex, "POLL_SECONDS", 0)
class FullRenderTests(unittest.TestCase):
    def setUp(self):
        self.workdir = Path("/tmp")
        self.order: list[str] = []
        download = mock.patch.object(roex, "_download", side_effect=self.fake_download)
        download.start()
        self.addCleanup(download.stop)

    def fake_download(self, url, workdir):
        self.order.append(f"download {url}")
        return workdir / "full.wav", "wav"

    def remember(self, data):
        self.order.append(f"remember {data['final_url']}")

    def test_recombine_full_saves_paid_url_before_download(self):
        api = FakeApi({"/retrieverecombine": [(202, {}), (200, {"result": {"master_url": "https://roex.test/full.wav"}})]})
        with mock.patch.object(roex, "_api_request", api):
            roex.create_full({"workflow": "recombine", "task_id": "rc_1"}, self.workdir, lambda _: None, self.remember)
        self.assertEqual(self.order, ["remember https://roex.test/full.wav", "download https://roex.test/full.wav"])

    def test_retry_reuses_saved_url_without_calling_roex(self):
        api = FakeApi({})
        with mock.patch.object(roex, "_api_request", api):
            roex.create_full({"workflow": "recombine", "task_id": "rc_1", "final_url": "https://roex.test/saved.wav"}, self.workdir, lambda _: None, self.remember)
        self.assertEqual(api.calls, [])
        self.assertEqual(self.order, ["download https://roex.test/saved.wav"])

    def test_multitrack_full_sends_original_tracks_and_finishes(self):
        api = FakeApi({"/retrievefinalmix": [(200, {"applyAudioEffectsResults": {"download_url_mixed": "https://roex.test/final.wav"}})]})
        data = {"workflow": "multitrack", "task_id": "mt_1", "track_urls": ["https://roex.test/1.wav", "https://roex.test/2.wav"], "loudness": "HIGH"}
        with mock.patch.object(roex, "_api_request", api), mock.patch.object(roex, "finish_loudness", side_effect=lambda source, target, lufs: target) as finish:
            roex.create_full(data, self.workdir, lambda _: None, self.remember)
        body = api.calls[0][1]["applyAudioEffectsData"]
        self.assertEqual(body["multitrackTaskId"], "mt_1")
        self.assertEqual([item["trackURL"] for item in body["trackData"]], data["track_urls"])
        self.assertEqual(finish.call_args.args[2], -9.0)

    def test_master_full_uses_final_master_endpoint(self):
        api = FakeApi({"/retrievefinalmaster": [(200, {"finalMasterTaskResults": "https://roex.test/master.wav"})]})
        with mock.patch.object(roex, "_api_request", api):
            roex.create_full({"workflow": "master", "task_id": "ms_1"}, self.workdir, lambda _: None, self.remember)
        self.assertEqual(api.calls[0][1], {"masteringData": {"masteringTaskId": "ms_1"}})

    def test_expired_recombine_link_is_refreshed_once(self):
        api = FakeApi({"/retrieverecombine": [(200, {"result": {"master_url": "https://roex.test/fresh.wav"}})]})
        expired = roex.RoExError("expired", "provider_expired")
        downloads = [expired, (self.workdir / "full.wav", "wav")]
        with mock.patch.object(roex, "_api_request", api), mock.patch.object(roex, "_download", side_effect=downloads):
            roex.create_full({"workflow": "recombine", "task_id": "rc_1", "final_url": "https://roex.test/old.wav"}, self.workdir, lambda _: None, self.remember)
        self.assertEqual(api.paths(), ["/retrieverecombine"])
        self.assertEqual(self.order, ["remember https://roex.test/fresh.wav"])

    def test_expired_paid_mix_link_is_not_rerequested(self):
        api = FakeApi({})
        with mock.patch.object(roex, "_api_request", api), mock.patch.object(roex, "_download", side_effect=roex.RoExError("expired", "provider_expired")):
            with self.assertRaises(roex.RoExError):
                roex.create_full({"workflow": "master", "task_id": "ms_1", "final_url": "https://roex.test/old.wav"}, self.workdir, lambda _: None, self.remember)
        self.assertEqual(api.calls, [])

    def test_unknown_provider_data_is_rejected(self):
        with self.assertRaises(roex.RoExError):
            roex.create_full({"workflow": "other"}, self.workdir, lambda _: None, self.remember)


if __name__ == "__main__":
    unittest.main()
