"""RoEx Tonn preview integration.

The integration only retrieves free preview results. It never retrieves billable
full-length mixes or masters.
"""

import json
import os
import re
import subprocess
import time
import unicodedata
from pathlib import Path
from http.client import HTTPSConnection
from urllib.parse import urlsplit
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "https://tonn.roexaudio.com"
POLL_SECONDS = 5
POLL_TIMEOUT_SECONDS = 600
MAX_OUTPUT_BYTES = 500 * 1024 * 1024


class RoExError(RuntimeError):
    """A provider error safe to include in operational logs."""


def _api_request(path: str, payload: dict) -> tuple[int, dict]:
    api_key = os.getenv("ROEX_API_KEY", "").strip()
    if not api_key:
        raise RoExError("RoEx Tonn is selected, but ROEX_API_KEY is not configured")

    body = json.dumps(payload).encode("utf-8")
    request = Request(
        f"{BASE_URL}{path}",
        data=body,
        headers={"X-API-Key": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=45) as response:
            raw = response.read(2 * 1024 * 1024)
            return response.status, json.loads(raw) if raw else {}
    except HTTPError as error:
        # Provider response bodies can contain diagnostics; keep them out of logs.
        raise RoExError(f"RoEx Tonn request failed with HTTP {error.code}") from error
    except (TimeoutError, URLError, OSError) as error:
        raise RoExError("RoEx Tonn could not be reached") from error
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RoExError("RoEx Tonn returned an invalid response") from error


def _upload(path: Path) -> str:
    content_type = "audio/wav"
    status, response = _api_request(
        "/upload",
        {"filename": path.name, "contentType": content_type},
    )
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


def _download(url: str, target: Path) -> str:
    if not url.startswith("https://"):
        raise RoExError("RoEx Tonn returned an invalid audio download URL")
    try:
        with urlopen(Request(url), timeout=90) as response, target.open("wb") as output:
            total = 0
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_OUTPUT_BYTES:
                    raise RoExError("RoEx Tonn preview exceeded the local output size limit")
                output.write(chunk)
            if total == 0:
                raise RoExError("RoEx Tonn returned an empty audio preview")
            content_type = response.headers.get("Content-Type", "").lower()
    except HTTPError as error:
        raise RoExError(f"RoEx Tonn audio download failed with HTTP {error.code}") from error
    except (TimeoutError, URLError, OSError) as error:
        raise RoExError("RoEx Tonn audio download failed") from error
    if "mpeg" in content_type or "mp3" in content_type:
        return "mp3"
    if "flac" in content_type:
        return "flac"
    return "wav"


def _style(prompt: str) -> str:
    text = "".join(character for character in unicodedata.normalize("NFKD", prompt.lower()) if not unicodedata.combining(character))
    if re.search(r"\b(trap|drill|rap|hip[ -]?hop|grime|afrobeat|afro)\b", text):
        return "HIPHOP_GRIME"
    if re.search(r"\b(pop|catchy|radio)\b", text):
        return "POP"
    if re.search(r"\b(acoustic|acoustique|folk|unplugged)\b", text):
        return "ACOUSTIC"
    if re.search(r"\b(electronic|electronique|edm|techno|house|synth)\b", text):
        return "ELECTRONIC"
    if re.search(r"\b(metal|heavy)\b", text):
        return "METAL"
    if re.search(r"\b(rock|indie|guitar band)\b", text):
        return "ROCK_INDIE"
    if re.search(r"\b(reggae|dub)\b", text):
        return "REGGAE_DUB"
    if re.search(r"\b(orchestral|orchestral|cinematic|strings|cinematique)\b", text):
        return "ORCHESTRAL"
    return "OTHER"


def _reverb(prompt: str, category: str) -> str:
    text = "".join(character for character in unicodedata.normalize("NFKD", prompt.lower()) if not unicodedata.combining(character))
    if category not in {"lead_vocal", "doubles", "backing_vocals", "adlibs"}:
        return "NONE"
    if re.search(r"\b(dry|sec|seche|no reverb|without reverb|sans reverbe)\b", text):
        return "NONE"
    if re.search(r"\b(lush|spacious|echoey|echoing|heavy reverb|lots of reverb)\b", text):
        return "HIGH"
    if re.search(r"\b(reverb|reverbe|roomy|space|ambient|spacieux)\b", text):
        return "LOW"
    return "NONE"


def _prepare_track(source: Path, target: Path, max_duration_seconds: int) -> None:
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(source),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    try:
        duration = float(probe.stdout.strip())
    except ValueError as error:
        raise RoExError("One of the audio tracks has an invalid duration") from error
    if duration <= 0 or duration > max_duration_seconds:
        limit = max_duration_seconds // 60
        raise RoExError(f"RoEx Tonn accepts tracks up to {limit} minutes long for this job")
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
            "-vn", "-ar", "44100", "-c:a", "pcm_s24le", str(target),
        ],
        check=True,
        capture_output=True,
        timeout=600,
    )


def _poll_result(path: str, payload: dict, result_key: str, url_key: str) -> str:
    deadline = time.monotonic() + POLL_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        status, response = _api_request(path, payload)
        if status == 202:
            time.sleep(POLL_SECONDS)
            continue
        if status != 200:
            raise RoExError(f"RoEx Tonn preview retrieval failed with HTTP {status}")
        result = response.get(result_key)
        if not isinstance(result, dict):
            raise RoExError("RoEx Tonn preview response did not contain a result")
        if result.get("error") or str(result.get("status", "")).lower() == "failed":
            raise RoExError("RoEx Tonn could not process this audio")
        url = result.get(url_key)
        if isinstance(url, str) and url:
            return url
        time.sleep(POLL_SECONDS)
    raise RoExError("RoEx Tonn preview timed out")


def create_preview(job: dict, source_paths: list[Path], output_path: Path, progress) -> str:
    """Create a free AI mixing or mastering preview and save it locally."""
    prepared: list[Path] = []
    max_duration_seconds = 10 * 60 if job["project_type"] == "master" else 8 * 60
    for index, source in enumerate(source_paths):
        target = output_path.parent / f"roex-track-{index}.wav"
        _prepare_track(source, target, max_duration_seconds)
        prepared.append(target)

    if job["project_type"] == "master":
        if len(prepared) != 1:
            raise RoExError("AI mastering requires exactly one finished track")
        readable_url = _upload(prepared[0])
        progress(35)
        _, created = _api_request(
            "/masteringpreview",
            {
                "masteringData": {
                    "trackData": [{"trackURL": readable_url}],
                    "musicalStyle": _style(job.get("prompt", "")),
                    "desiredLoudness": "MEDIUM",
                    "sampleRate": "44100",
                }
            },
        )
        task_id = created.get("mastering_task_id") or created.get("masteringTaskId")
        if not isinstance(task_id, str):
            raise RoExError("RoEx Tonn did not create a mastering task")
        progress(55)
        url = _poll_result(
            "/retrievepreviewmaster",
            {"masteringData": {"masteringTaskId": task_id}},
            "previewMasterTaskResults",
            "download_url_mastered_preview",
        )
    else:
        if not 2 <= len(prepared) <= 32:
            raise RoExError("RoEx AI mixing needs 2 to 32 separate tracks")
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
                    "reverbPreference": _reverb(job.get("prompt", ""), category),
                }
            )
            progress(min(35, 10 + int(25 * (index + 1) / len(prepared))))
        _, created = _api_request(
            "/mixpreview",
            {
                "multitrackData": {
                    "trackData": track_data,
                    "musicalStyle": _style(job.get("prompt", "")),
                    "returnStems": False,
                    "sampleRate": 44100,
                }
            },
        )
        task_id = created.get("multitrack_task_id") or created.get("multitrackTaskId")
        if not isinstance(task_id, str):
            raise RoExError("RoEx Tonn did not create a mixing task")
        progress(55)
        url = _poll_result(
            "/retrievepreviewmix",
            {"multitrackData": {"multitrackTaskId": task_id, "retrieveFXSettings": False}},
            "previewMixTaskResults",
            "download_url_preview_mixed",
        )

    progress(85)
    return _download(url, output_path)
