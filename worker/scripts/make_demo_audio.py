"""Render the landing page's before/after demo from original synthesized tracks.

The "before" is a raw sum (vocal too quiet, out of tune, dry). The "after" runs the same
tracks through FastMix's local engine. Both are loudness-matched so the comparison is about
balance, tuning and space rather than volume.

Run inside the worker image:
  docker compose run --rm -v ./worker/scripts:/srv/fastmix/scripts:ro -v ./web/public/demo:/out --no-deps api python -m scripts.make_demo_audio /out
"""

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import parselmouth

from app.audio import finish_loudness, local_mix_graph
from app.direction import refine, settings_from_prompt
from app.vocals import VOCAL_CATEGORIES, autotune

RATE = 44100
BPM = 140
BEAT = 60 / BPM
BARS = 8
LENGTH = BARS * 4 * BEAT
rng = np.random.default_rng(7)


def silence() -> np.ndarray:
    return np.zeros(int(LENGTH * RATE))


def place(track: np.ndarray, sound: np.ndarray, start: float):
    begin = int(start * RATE)
    end = min(len(track), begin + len(sound))
    track[begin:end] += sound[: end - begin]


def envelope(samples: int, attack: float, release: float) -> np.ndarray:
    env = np.ones(samples)
    a, r = int(attack * RATE), int(release * RATE)
    env[:a] = np.linspace(0, 1, a)
    env[-r:] *= np.linspace(1, 0, r)
    return env


def midi_hz(note: float) -> float:
    return 440 * 2 ** ((note - 69) / 12)


def beat_track() -> np.ndarray:
    track = silence()
    t = np.arange(int(0.45 * RATE)) / RATE
    kick = np.sin(2 * np.pi * (45 * t + 90 * (1 - np.exp(-t * 30)) / 30)) * np.exp(-t * 7)
    clap = rng.normal(0, 1, int(0.18 * RATE)) * np.exp(-np.arange(int(0.18 * RATE)) / RATE * 28)
    hat = rng.normal(0, 1, int(0.04 * RATE)) * np.exp(-np.arange(int(0.04 * RATE)) / RATE * 120)
    roots = [57, 57, 53, 53, 48, 48, 55, 55]  # A, F, C, G (two bars each)
    for bar in range(BARS):
        start = bar * 4 * BEAT
        for position in (0, 1.5, 2.75):
            place(track, 0.9 * kick, start + position * BEAT)
        place(track, 0.35 * clap, start + 2 * BEAT)
        for step in range(8):
            place(track, (0.12 if step % 2 else 0.18) * hat, start + step * BEAT / 2)
        n = int(4 * BEAT * RATE)
        bass_t = np.arange(n) / RATE
        bass = np.sin(2 * np.pi * midi_hz(roots[bar] - 24) * bass_t) * envelope(n, 0.01, 0.2)
        place(track, 0.45 * np.tanh(2 * bass), start)
        chord = sum(np.sin(2 * np.pi * midi_hz(roots[bar] + interval) * bass_t) for interval in (12, 15, 19))
        place(track, 0.05 * chord * envelope(n, 0.3, 0.6), start)
    return track


def vocal_track() -> np.ndarray:
    """A sung-vowel melody in A minor, each note detuned the way a rough take would be."""
    track = silence()
    phrase = [(76, 1), (74, 0.5), (72, 0.5), (71, 1), (72, 1), (69, 2), (None, 2),
              (72, 1), (74, 0.5), (76, 0.5), (77, 1), (76, 1), (74, 2), (None, 2)]
    time = 2 * 4 * BEAT
    for note, beats in phrase * 2:
        duration = beats * BEAT
        if note is not None and time < LENGTH:
            n = int(duration * 0.92 * RATE)
            t = np.arange(n) / RATE
            detune = rng.uniform(-45, 45)
            cents = detune + 25 * np.sin(2 * np.pi * 5.2 * t) + np.linspace(rng.uniform(-20, 0), 0, n)
            phase = 2 * np.pi * np.cumsum(midi_hz(note) * 2 ** (cents / 1200)) / RATE
            voice = sum(np.sin(h * phase) / h ** 1.2 for h in range(1, 16))
            place(track, 0.25 * voice * envelope(n, 0.04, 0.09), time)
        time += duration
    return track


def write(path: Path, signal: np.ndarray):
    parselmouth.Sound(signal / max(1e-9, np.max(np.abs(signal))) * 0.8, sampling_frequency=RATE).save(str(path), "WAV")


def main(out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        work = Path(temp)
        beat, raw_vocal = work / "beat.wav", work / "vocal-raw.wav"
        write(beat, beat_track())
        # Shape the vowel and leave the take too quiet in the raw recording.
        write(work / "vocal-tone.wav", vocal_track())
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(work / "vocal-tone.wav"), "-af",
                        "equalizer=f=750:t=q:w=2:g=10,equalizer=f=1200:t=q:w=2:g=7,equalizer=f=2700:t=q:w=3:g=5,lowpass=f=5000,volume=-9dB",
                        str(raw_vocal)], check=True)

        before_mix = work / "before-mix.wav"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(beat), "-i", str(raw_vocal), "-filter_complex",
                        "[0:a][1:a]amix=inputs=2:normalize=0[out]", "-map", "[out]", "-c:a", "pcm_f32le", str(before_mix)], check=True)

        settings, _ = refine(settings_from_prompt("melodic trap, vocals upfront, some reverb, autotune in A minor"), "vocals up even more")
        tuned = autotune(raw_vocal, work / "vocal-tuned.wav", settings["autotune"]["strength"], settings["autotune"]["scale"])
        after_mix = work / "after-mix.wav"
        graph = local_mix_graph(["beat", "lead_vocal"], settings, VOCAL_CATEGORIES)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(beat), "-i", str(tuned), "-filter_complex", graph,
                        "-map", "[out]", "-c:a", "pcm_f32le", str(after_mix)], check=True)

        for name, mix in (("before", before_mix), ("after", after_mix)):
            finished = finish_loudness(mix, work / f"{name}-finished.wav", -14.0)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(finished), "-ac", "2", "-c:a", "libmp3lame", "-b:a", "160k",
                            str(out_dir / f"mix-{name}.mp3")], check=True)
    print("Wrote", *(str(out_dir / f"mix-{name}.mp3") for name in ("before", "after")))


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "/out"))
