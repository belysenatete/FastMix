"""Prompt-driven vocal pitch correction (autotune) with Praat's PSOLA resynthesis."""

import math
import re
import subprocess
import unicodedata
from pathlib import Path

import numpy as np
import parselmouth
from parselmouth.praat import call


VOCAL_CATEGORIES = {"lead_vocal", "doubles", "backing_vocals", "adlibs"}
NOTE_CLASSES = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}
SOLFEGE = {"do": "c", "re": "d", "mi": "e", "fa": "f", "sol": "g", "la": "a", "si": "b"}
SCALE_STEPS = {"major": (0, 2, 4, 5, 7, 9, 11), "minor": (0, 2, 3, 5, 7, 8, 10)}
PITCH_FLOOR_HZ = 75
PITCH_CEILING_HZ = 900


def normalize_prompt(text: str) -> str:
    """Lowercase and strip accents so English and French directions match the same patterns."""
    return "".join(character for character in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(character))


def _key_scale(text: str) -> tuple[int, ...] | None:
    english = re.search(r"\b([a-g])\s*(#|sharp|b|flat)?\s*(major|minor|maj|min)\b", text)
    french = re.search(r"\b(do|re|mi|fa|sol|la|si)\s*(#|diese|b|bemol)?\s*(majeur|mineur)\b", text)
    match = english or french
    if not match:
        return None
    note, accidental, quality = match.groups()
    root = NOTE_CLASSES[SOLFEGE.get(note, note)]
    if accidental in {"#", "sharp", "diese"}:
        root += 1
    elif accidental in {"b", "flat", "bemol"}:
        root -= 1
    steps = SCALE_STEPS["minor" if quality in {"minor", "min", "mineur"} else "major"]
    return tuple(sorted((root + step) % 12 for step in steps))


def autotune_settings(prompt: str) -> dict | None:
    """Return pitch-correction settings when the direction asks for autotune, otherwise None."""
    text = normalize_prompt(prompt)
    if re.search(r"\b(no|without|sans|pas d'?)\s*(auto-?tune|pitch correction)\b", text):
        return None
    if not re.search(r"\b(auto-?tune[ds]?|autotunee?|pitch[ -]correct(ion|ed)?|tuned vocals?|t-?pain|melodyne)\b", text):
        return None
    strength = 0.8
    if re.search(r"\b(hard|heavy|strong|robotic|robotique|t-?pain|extreme|fort|max)\b", text):
        strength = 1.0
    elif re.search(r"\b(subtle|light|natural|gentle|soft|leger|legere|discret|naturel)\b", text):
        strength = 0.45
    return {"strength": strength, "scale": _key_scale(text)}


def _snap(midi: float, scale: tuple[int, ...] | None) -> float:
    nearest = round(midi)
    if not scale:
        return nearest
    candidates = [note for note in range(nearest - 2, nearest + 3) if note % 12 in scale]
    return min(candidates, key=lambda note: abs(note - midi))


def autotune(source: Path, target: Path, strength: float, scale: tuple[int, ...] | None = None) -> Path:
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
