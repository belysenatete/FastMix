"""MP3 copies of finished WAV renders. Runs in the processor, which has ffmpeg; the API only hands out links."""
import subprocess
import tempfile
from pathlib import Path

from .audio import STREAMING_TRUE_PEAK_DB, measure_true_peak

# Queue messages with this prefix ask the processor for an MP3 of the named job's output.
MP3_REQUEST_PREFIX = "mp3:"


def mp3_key_for(wav_key: str) -> str:
    return wav_key.rsplit(".", 1)[0] + ".mp3"


def ensure_mp3(client, bucket: str, wav_key: str) -> str:
    """Return the key of a 320 kbps MP3 copy of a stored WAV, creating it if it isn't there yet."""
    mp3_key = mp3_key_for(wav_key)
    try:
        client.head_object(Bucket=bucket, Key=mp3_key)
        return mp3_key
    except client.exceptions.ClientError:
        pass
    with tempfile.TemporaryDirectory(prefix="fastmix-mp3-") as temp_dir:
        source, target = Path(temp_dir) / "source.wav", Path(temp_dir) / "track.mp3"
        client.download_file(bucket, wav_key, str(source))

        def encode(gain_db: float):
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-af", f"volume={gain_db:.2f}dB", "-c:a", "libmp3lame", "-b:a", "320k", "-ar", "44100", str(target)],
                check=True, timeout=300, capture_output=True,
            )

        encode(0.0)
        # MP3 encoding can push inter-sample peaks above the WAV's; turn it down just enough to stay streaming-safe.
        overshoot = measure_true_peak(target) - STREAMING_TRUE_PEAK_DB
        if overshoot > 0:
            encode(-(overshoot + 0.1))
        client.upload_file(str(target), bucket, mp3_key, ExtraArgs={"ContentType": "audio/mpeg"})
    return mp3_key
