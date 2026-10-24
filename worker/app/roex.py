"""RoEx Tonn integration.

Previews are free while the RoEx account has a positive credit balance.
Full-length renders spend credits, so they only run for an explicit full-render
job that reuses the preview's provider task. The provider's final URL is saved
as soon as RoEx returns it, so a retried download never pays twice.
"""

import json
import os
import subprocess
import time
from pathlib import Path
from http.client import HTTPSConnection
from urllib.parse import urlsplit
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .audio import LOUDNESS_TARGET_LUFS, finish_loudness
from .direction import style_for
from .vocals import VOCAL_CATEGORIES


BASE_URL = "https://tonn.roexaudio.com"
POLL_SECONDS = 5
POLL_TIMEOUT_SECONDS = 900
MAX_OUTPUT_BYTES = 500 * 1024 * 1024


class RoExError(RuntimeError):
    """A provider error whose message is safe to show users and write to logs."""

    def __init__(self, message: str, code: str = "provider_failed"):
        super().__init__(message)
        self.code = code


def _api_request(path: str, payload: dict | None = None, method: str = "POST") -> tuple[int, dict]:
    api_key = os.getenv("ROEX_API_KEY", "").strip()
    if not api_key:
        raise RoExError("RoEx Tonn is selected, but ROEX_API_KEY is not configured", "provider_not_configured")

    request = Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers={"X-API-Key": api_key, "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urlopen(request, timeout=45) as response:
            raw = response.read(2 * 1024 * 1024)
            return response.status, json.loads(raw) if raw else {}
    except HTTPError as error:
        # Provider response bodies can contain diagnostics; keep them out of logs.
        if error.code == 402:
            raise RoExError("Your RoEx credit balance is too low for a full-length track. Add credits, then retry.", "provider_credits") from error
        if error.code == 401:
            raise RoExError("RoEx rejected the API key. Check ROEX_API_KEY.", "provider_auth") from error
        raise RoExError(f"RoEx Tonn request failed with HTTP {error.code}") from error
    except (TimeoutError, URLError, OSError) as error:
        raise RoExError("RoEx Tonn could not be reached") from error
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RoExError("RoEx Tonn returned an invalid response") from error


def _upload(path: Path) -> str:
    content_type = "audio/wav"
    status, response = _api_request("/upload", {"filename": path.name, "contentType": content_type})
    if status != 200:
        raise RoExError(f"RoEx Tonn upload URL request failed with HTTP {status}")
    signed_url = response.get("signed_url")
    readable_url = response.get("readable_url")
    if not isinstance(signed_url, str) or not isinstance(readable_url, str):
        raise RoExError("RoEx Tonn did not return audio upload URLs")
    parsed = urlsplit(signed_url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise RoExError("RoEx Tonn returned an invalid audio upload URL")
    connection = HTTPSConnection(parsed.netloc, timeout=180)
    try:
        request_path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        connection.putrequest("PUT", request_path)
        connection.putheader("Content-Type", content_type)
        connection.putheader("Content-Length", str(path.stat().st_size))
        connection.endheaders()
        with path.open("rb") as audio:
            while chunk := audio.read(1024 * 1024):
                connection.send(chunk)
        response = connection.getresponse()
        response.read(4096)
        if response.status != 200:
            raise RoExError(f"RoEx Tonn audio upload failed with HTTP {response.status}")
    except (TimeoutError, OSError) as error:
        raise RoExError("RoEx Tonn audio upload failed") from error
    finally:
        connection.close()
    return readable_url


def _download(url: str, workdir: Path) -> tuple[Path, str]:
    if not url.startswith("https://"):
        raise RoExError("RoEx Tonn returned an invalid audio download URL")
    target = workdir / "roex-output.download"
    try:
        with urlopen(Request(url), timeout=120) as response, target.open("wb") as output:
            total = 0
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_OUTPUT_BYTES:
                    raise RoExError("RoEx Tonn output exceeded the local output size limit")
                output.write(chunk)
            if total == 0:
                raise RoExError("RoEx Tonn returned an empty audio file")
            content_type = response.headers.get("Content-Type", "").lower()
    except HTTPError as error:
        code = "provider_expired" if error.code in {403, 404} else "provider_failed"
        raise RoExError(f"RoEx Tonn audio download failed with HTTP {error.code}", code) from error
    except (TimeoutError, URLError, OSError) as error:
        raise RoExError("RoEx Tonn audio download failed") from error
    extension = Path(urlsplit(url).path).suffix.lower().lstrip(".")
    if "mpeg" in content_type or "mp3" in content_type or extension == "mp3":
        output_format = "mp3"
    elif "flac" in content_type or extension == "flac":
        output_format = "flac"
    else:
        output_format = "wav"
    final = target.with_name(f"roex-output.{output_format}")
    target.replace(final)
    return final, output_format


def plan(job: dict) -> str:
    """Choose the RoEx workflow for a session: master, recombine, or multitrack."""
    if job["project_type"] == "master":
        return "master"
    categories = [track["category"] for track in job["tracks"]]
    if len(categories) == 2 and categories.count("beat") == 1 and sum(category in VOCAL_CATEGORIES for category in categories) == 1:
        return "recombine"
    return "multitrack"


def _prepare_track(source: Path, target: Path, max_duration_seconds: int, gain_db: float = 0.0) -> None:
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(source)],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    try:
        duration = float(probe.stdout.strip())
    except ValueError as error:
        raise RoExError("One of the audio tracks has an invalid duration", "invalid_audio") from error
    if duration <= 0 or duration > max_duration_seconds:
        raise RoExError(f"RoEx Tonn accepts tracks up to {max_duration_seconds // 60} minutes long for this job", "invalid_audio")
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-vn", *(["-af", f"volume={gain_db}dB"] if gain_db else []), "-ar", "44100", "-c:a", "pcm_s24le", str(target)],
        check=True,
        capture_output=True,
        timeout=600,
    )


def _poll(path: str, payload: dict | None, extract, method: str = "POST") -> object:
    """Call an endpoint until it stops answering 202 and `extract` finds a result."""
    deadline = time.monotonic() + POLL_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        status, response = _api_request(path, payload, method)
        if status == 202:
            time.sleep(POLL_SECONDS)
            continue
        if status != 200:
            raise RoExError(f"RoEx Tonn result retrieval failed with HTTP {status}")
        result = extract(response)
        if result:
            return result
        time.sleep(POLL_SECONDS)
    raise RoExError("RoEx Tonn processing timed out")


def _task_id(created: dict, *keys: str) -> str | None:
    """Return a newly created task's ID, refusing the placeholder tasks RoEx creates for development keys."""
    if "dummy" in str(created.get("message", "")).lower():
        raise RoExError(
            "This RoEx API key is a development key, so RoEx returns placeholder results instead of real mixes. Use your production key for real AI processing.",
            "provider_dev_key",
        )
    task_id = next((created[key] for key in keys if isinstance(created.get(key), str)), None)
    return None if created.get("error") else task_id


def _task_failed(result: dict) -> bool:
    return bool(result.get("error")) or str(result.get("status", "")).lower() == "failed"


def _preview_url(result_key: str, url_key: str):
    def extract(response: dict):
        result = response.get(result_key)
        if not isinstance(result, dict):
            raise RoExError("RoEx Tonn preview response did not contain a result")
        if _task_failed(result):
            raise RoExError("RoEx Tonn could not process this audio", "invalid_audio")
        url = result.get(url_key)
        return url if isinstance(url, str) and url else None
    return extract


def create_preview(job: dict, source_paths: list[Path], workdir: Path, progress) -> tuple[Path, str, dict]:
    """Create a free 30-second AI preview. Returns the local file, its format, and provider data."""
    workflow = plan(job)
    settings = job["settings"]
    max_duration_seconds = 10 * 60 if workflow == "master" else 8 * 60
    prepared: list[Path] = []
    for index, (source, track) in enumerate(zip(source_paths, job["tracks"], strict=True)):
        target = workdir / f"roex-track-{index}.wav"
        # Recombine takes vocalGainDb natively; multitrack has no vocal-level control, so pre-gain those stems.
        gain = settings["vocal_gain_db"] if workflow == "multitrack" and track["category"] in VOCAL_CATEGORIES else 0.0
        _prepare_track(source, target, max_duration_seconds, gain)
        prepared.append(target)

    if workflow == "master":
        if len(prepared) != 1:
            raise RoExError("AI mastering requires exactly one finished track", "invalid_audio")
        readable_url = _upload(prepared[0])
        progress(35)
        _, created = _api_request(
            "/masteringpreview",
            {"masteringData": {"trackData": [{"trackURL": readable_url}], "musicalStyle": style_for(settings["genre"], "master"), "desiredLoudness": settings["loudness"], "sampleRate": "44100"}},
        )
        task_id = _task_id(created, "mastering_task_id", "masteringTaskId")
        if not task_id:
            raise RoExError("RoEx Tonn did not create a mastering task")
        progress(55)
        url = _poll("/retrievepreviewmaster", {"masteringData": {"masteringTaskId": task_id}}, _preview_url("previewMasterTaskResults", "download_url_mastered_preview"))
        provider_data = {"workflow": "master", "task_id": task_id}
    elif workflow == "recombine":
        beat_index = next(index for index, track in enumerate(job["tracks"]) if track["category"] == "beat")
        vocal_index = 1 - beat_index
        backing_url = _upload(prepared[beat_index])
        vocal_url = _upload(prepared[vocal_index])
        progress(35)
        _, created = _api_request(
            "/recombine",
            {"recombineData": {"vocalStemURL": vocal_url, "backingStemURL": backing_url, "musicalStyle": style_for(settings["genre"], "recombine"), "desiredLoudness": settings["loudness"], "vocalGainDb": settings["vocal_gain_db"]}},
        )
        task_id = _task_id(created, "recombineTaskId")
        if not task_id:
            raise RoExError("RoEx Tonn did not create a vocal mix task")
        progress(50)

        def recombine_done(response: dict):
            if _task_failed(response):
                raise RoExError("RoEx Tonn could not mix this vocal and beat", "invalid_audio")
            return str(response.get("status", "")).lower() == "complete"

        _poll(f"/recombinestatus/{task_id}", None, recombine_done, method="GET")
        progress(70)

        def preview_ready(response: dict):
            url = (response.get("preview") or {}).get("preview_url")
            return url if isinstance(url, str) and url else None

        url = _poll("/retrieverecombinepreview", {"recombineData": {"recombineTaskId": task_id}}, preview_ready)
        provider_data = {"workflow": "recombine", "task_id": task_id}
    else:
        if not 2 <= len(prepared) <= 32:
            raise RoExError("RoEx AI mixing needs 2 to 32 separate tracks", "invalid_audio")
        track_data = []
        for index, (source, track) in enumerate(zip(prepared, job["tracks"], strict=True)):
            readable_url = _upload(source)
            category = track["category"]
            group = {
                "beat": "BACKING_TRACK_GROUP",
                "lead_vocal": "VOCAL_GROUP",
                "doubles": "BACKING_VOX_GROUP",
                "backing_vocals": "BACKING_VOX_GROUP",
                "adlibs": "BACKING_VOX_GROUP",
                "instrument": "OTHER_GROUP1",
            }.get(category, "OTHER_GROUP1")
            track_data.append(
                {
                    "trackURL": readable_url,
                    "instrumentGroup": group,
                    "presenceSetting": "LEAD" if category == "lead_vocal" else "BACKGROUND" if category in {"doubles", "backing_vocals", "adlibs"} else "NORMAL",
                    "panPreference": "CENTRE" if category in {"beat", "lead_vocal"} else "NO_PREFERENCE",
                    "reverbPreference": settings["reverb"] if category in VOCAL_CATEGORIES else "NONE",
                }
            )
            progress(min(35, 10 + int(25 * (index + 1) / len(prepared))))
        # The live /mixpreview rejects a numeric sampleRate ("JSON format not valid: type: string") despite the published spec.
        _, created = _api_request(
            "/mixpreview",
            {"multitrackData": {"trackData": track_data, "musicalStyle": style_for(settings["genre"], "mix"), "returnStems": False, "sampleRate": "44100"}},
        )
        task_id = _task_id(created, "multitrack_task_id", "multitrackTaskId")
        if not task_id:
            raise RoExError("RoEx Tonn did not create a mixing task")
        progress(55)
        url = _poll(
            "/retrievepreviewmix",
            {"multitrackData": {"multitrackTaskId": task_id, "retrieveFXSettings": False}},
            _preview_url("previewMixTaskResults", "download_url_preview_mixed"),
        )
        provider_data = {"workflow": "multitrack", "task_id": task_id, "track_urls": [item["trackURL"] for item in track_data], "loudness": settings["loudness"]}

    progress(85)
    output, output_format = _download(url, workdir)
    if workflow == "multitrack":
        # RoEx multitrack mixes are not mastered; finish them to a release-like loudness locally.
        output, output_format = finish_loudness(output, workdir / "roex-finished.wav", LOUDNESS_TARGET_LUFS[provider_data["loudness"]]), "wav"
    return output, output_format, provider_data


def create_full(provider_data: dict, workdir: Path, progress, remember) -> tuple[Path, str]:
    """Render the full-length track for a completed preview. This spends RoEx credits once."""
    url = provider_data.get("final_url")
    workflow = provider_data.get("workflow")
    task_id = provider_data.get("task_id")
    if not isinstance(task_id, str) or workflow not in {"master", "recombine", "multitrack"}:
        raise RoExError("This preview cannot be rendered at full length", "provider_failed")

    if not url:
        progress(15)
        if workflow == "recombine":
            def master_ready(response: dict):
                result_url = (response.get("result") or {}).get("master_url")
                return result_url if isinstance(result_url, str) and result_url else None

            url = _poll("/retrieverecombine", {"recombineData": {"recombineTaskId": task_id}}, master_ready)
        elif workflow == "master":
            def final_master(response: dict):
                result_url = response.get("finalMasterTaskResults")
                return result_url if isinstance(result_url, str) and result_url else None

            url = _poll("/retrievefinalmaster", {"masteringData": {"masteringTaskId": task_id}}, final_master)
        else:
            track_urls = provider_data.get("track_urls") or []
            if len(track_urls) < 2:
                raise RoExError("This preview is missing its RoEx track references", "provider_failed")

            def final_mix(response: dict):
                result_url = (response.get("applyAudioEffectsResults") or {}).get("download_url_mixed")
                return result_url if isinstance(result_url, str) and result_url else None

            url = _poll(
                "/retrievefinalmix",
                {"applyAudioEffectsData": {"multitrackTaskId": task_id, "trackData": [{"trackURL": track_url, "gainDb": 0} for track_url in track_urls], "returnStems": False, "sampleRate": "44100"}},
                final_mix,
            )
        # Persist before downloading so a retry reuses the paid result instead of paying again.
        remember({**provider_data, "final_url": url})

    progress(70)
    try:
        output, output_format = _download(url, workdir)
    except RoExError as error:
        # RoEx signs result URLs for 24 hours. Recombine charges only on the first retrieval,
        # so an expired saved link can be refreshed for free; other workflows stop here.
        if error.code != "provider_expired" or workflow != "recombine" or not provider_data.get("final_url"):
            raise
        return create_full({key: value for key, value in provider_data.items() if key != "final_url"}, workdir, progress, remember)
    if workflow == "multitrack":
        output, output_format = finish_loudness(output, workdir / "roex-finished.wav", LOUDNESS_TARGET_LUFS.get(provider_data.get("loudness", "MEDIUM"), -11.0)), "wav"
    return output, output_format
