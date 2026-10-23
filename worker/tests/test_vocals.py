import math
import tempfile
import unittest
from pathlib import Path

import numpy as np
import parselmouth

from app import vocals


def harmonic_tone(path: Path, frequency: float, seconds: float = 2.0, rate: int = 44100) -> Path:
    """A buzzy, voice-like tone (decaying harmonics) that Praat can track and resynthesize."""
    times = np.arange(int(seconds * rate)) / rate
    signal = sum(np.sin(2 * math.pi * frequency * harmonic * times) / harmonic for harmonic in range(1, 12))
    parselmouth.Sound(0.3 * signal / np.max(np.abs(signal)), sampling_frequency=rate).save(str(path), "WAV")
    return path


def median_pitch(path: Path) -> float:
    pitch = parselmouth.Sound(str(path)).to_pitch(time_step=0.01, pitch_floor=75, pitch_ceiling=900)
    values = pitch.selected_array["frequency"]
    return float(np.median(values[values > 0]))


class SettingsTests(unittest.TestCase):
    def test_autotune_is_off_unless_asked(self):
        self.assertIsNone(vocals.autotune_settings("warm trap vocal, lots of reverb"))
        self.assertIsNone(vocals.autotune_settings("no autotune please, keep it raw"))
        self.assertIsNone(vocals.autotune_settings("sans autotune"))

    def test_strength_follows_the_direction(self):
        self.assertEqual(vocals.autotune_settings("autotune on the lead")["strength"], 0.8)
        self.assertEqual(vocals.autotune_settings("hard robotic auto-tune, T-Pain style")["strength"], 1.0)
        self.assertEqual(vocals.autotune_settings("subtle pitch correction, natural")["strength"], 0.45)
        self.assertEqual(vocals.autotune_settings("autotune léger")["strength"], 0.45)

    def test_key_is_parsed_in_english_and_french(self):
        self.assertEqual(vocals.autotune_settings("autotune in A minor")["scale"], (0, 2, 4, 5, 7, 9, 11))
        self.assertEqual(vocals.autotune_settings("autotune, key of F# major")["scale"], (1, 3, 5, 6, 8, 10, 11))
        self.assertEqual(vocals.autotune_settings("Bb minor with autotune")["scale"], (0, 1, 3, 5, 6, 8, 10))
        self.assertEqual(vocals.autotune_settings("autotune en la mineur")["scale"], (0, 2, 4, 5, 7, 9, 11))
        self.assertIsNone(vocals.autotune_settings("autotune")["scale"])

    def test_snap_respects_scale(self):
        self.assertEqual(vocals._snap(69.6, None), 70)
        self.assertEqual(vocals._snap(69.6, (0, 2, 4, 5, 7, 9, 11)), 69)


class PitchCorrectionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)

    def assertPitch(self, path: Path, expected: float, tolerance_cents: float = 15):
        cents = 1200 * math.log2(median_pitch(path) / expected)
        self.assertLess(abs(cents), tolerance_cents, f"pitch off by {cents:.1f} cents")

    def test_hard_tune_snaps_a_flat_note_to_pitch(self):
        source = harmonic_tone(self.root / "sharp.wav", 452.0)  # ~46 cents sharp of A4
        output = vocals.autotune(source, self.root / "tuned.wav", strength=1.0)
        self.assertPitch(output, 440.0)

    def test_partial_strength_moves_halfway(self):
        source = harmonic_tone(self.root / "sharp.wav", 452.0)
        output = vocals.autotune(source, self.root / "tuned.wav", strength=0.5)
        self.assertPitch(output, 440.0 * 2 ** (0.5 * math.log2(452.0 / 440.0)))

    def test_scale_changes_the_target_note(self):
        source = harmonic_tone(self.root / "between.wav", 455.0)  # nearer A#4 chromatically
        self.assertPitch(vocals.autotune(source, self.root / "chromatic.wav", strength=1.0), 466.16)
        self.assertPitch(vocals.autotune(source, self.root / "c-major.wav", strength=1.0, scale=(0, 2, 4, 5, 7, 9, 11)), 440.0)

    def test_output_keeps_length_and_does_not_clip(self):
        source = harmonic_tone(self.root / "tone.wav", 300.0, seconds=3.0)
        output = parselmouth.Sound(str(vocals.autotune(source, self.root / "tuned.wav", strength=1.0)))
        self.assertAlmostEqual(output.duration, 3.0, delta=0.05)
        self.assertLessEqual(float(np.max(np.abs(output.values))), 1.0)


if __name__ == "__main__":
    unittest.main()
