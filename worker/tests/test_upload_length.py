import io
import shutil
import subprocess
import tempfile
import unittest
import wave
from pathlib import Path

from fastapi import HTTPException

from app import uploads


class FakeStorage:
    """Serves byte ranges of an in-memory object, like S3 get_object with Range, and counts what it sent."""

    def __init__(self, data: bytes):
        self.data = data
        self.sent = 0

    def get_object(self, Bucket, Key, Range):
        start, end = (int(part) for part in Range.removeprefix("bytes=").split("-"))
        chunk = self.data[start:end + 1]
        self.sent += len(chunk)
        return {"Body": io.BytesIO(chunk)}


def wav_bytes(seconds: float, rate: int = 8000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(1)
        file.setframerate(rate)
        file.writeframes(b"\x80" * int(seconds * rate))
    return buffer.getvalue()


def stored_seconds(data: bytes) -> tuple[float | None, int]:
    storage = FakeStorage(data)
    reader = io.BufferedReader(uploads.StoredAudio(storage, "bucket", "key", len(data)))
    return uploads.audio_seconds(reader), storage.sent


class UploadLengthTest(unittest.TestCase):
    def test_reads_wav_length_from_headers_only(self):
        data = wav_bytes(540)  # 9 minutes, 4.3 MB
        seconds, sent = stored_seconds(data)
        self.assertAlmostEqual(seconds, 540, delta=0.1)
        self.assertLess(sent, 1024 * 1024)

    @unittest.skipUnless(shutil.which("ffmpeg"), "ffmpeg not installed")
    def test_reads_mp3_length(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "tone.mp3"
            subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=330:duration=540", "-b:a", "64k", str(path)], check=True)
            seconds, _ = stored_seconds(path.read_bytes())
        self.assertAlmostEqual(seconds, 540, delta=2)

    def test_unknown_content_gives_no_length(self):
        self.assertEqual(stored_seconds(b"not audio at all, just text" * 10)[0], None)

    def test_mix_tracks_over_eight_minutes_are_refused(self):
        uploads.check_length(480, "beat")
        with self.assertRaises(HTTPException) as caught:
            uploads.check_length(540, "lead_vocal")
        self.assertEqual(caught.exception.status_code, 413)
        self.assertEqual(caught.exception.detail, "Tracks for a mix must be 8 minutes or shorter. This one is 9:00.")

    def test_master_allows_ten_minutes(self):
        uploads.check_length(540, "master")
        with self.assertRaises(HTTPException) as caught:
            uploads.check_length(605, "master")
        self.assertEqual(caught.exception.detail, "A finished track to master must be 10 minutes or shorter. This one is 10:05.")

    def test_unknown_length_is_allowed(self):
        uploads.check_length(None, "beat")


if __name__ == "__main__":
    unittest.main()
