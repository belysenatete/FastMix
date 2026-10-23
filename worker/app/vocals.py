"""Vocal pitch correction (autotune) with Praat's PSOLA resynthesis."""

import math
import subprocess
from pathlib import Path

import numpy as np
import parselmouth
from parselmouth.praat import call


VOCAL_CATEGORIES = {"lead_vocal", "doubles", "backing_vocals", "adlibs"}
PITCH_FLOOR_HZ = 75
PITCH_CEILING_HZ = 900


def _snap(midi: float, scale: list[int] | tuple[int, ...] | None) -> float:
    nearest = round(midi)
    if not scale:
        return nearest
    candidates = [note for note in range(nearest - 2, nearest + 3) if note % 12 in scale]
    return min(candidates, key=lambda note: abs(note - midi))


def autotune(source: Path, target: Path, strength: float, scale: list[int] | tuple[int, ...] | None = None) -> Path:
    """Pull each voiced pitch point toward the nearest note (or note in `scale`) by `strength` (0–1)."""
    decoded = target.with_name(f"{target.stem}-decoded.wav")
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-vn", "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(decoded)],
        check=True,
        capture_output=True,
        timeout=600,
    )
    sound = parselmouth.Sound(str(decoded))
    manipulation = call(sound, "To Manipulation", 0.01, PITCH_FLOOR_HZ, PITCH_CEILING_HZ)
    original = call(manipulation, "Extract pitch tier")
    tuned = call("Create PitchTier", "tuned", sound.xmin, sound.xmax)
    for index in range(1, call(original, "Get number of points") + 1):
        time = call(original, "Get time from index", index)
        frequency = call(original, "Get value at index", index)
        if frequency <= 0:
            continue
        midi = 69 + 12 * math.log2(frequency / 440)
        corrected = midi + strength * (_snap(midi, scale) - midi)
        call(tuned, "Add point", time, 440 * 2 ** ((corrected - 69) / 12))
    call([tuned, manipulation], "Replace pitch tier")
    result = call(manipulation, "Get resynthesis (overlap-add)")
    if np.max(np.abs(result.values)) > 0.99:
        result.scale_peak(0.99)
    result.save(str(target), "WAV")
    decoded.unlink(missing_ok=True)
    return target
