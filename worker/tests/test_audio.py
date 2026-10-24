import math
import tempfile
import unittest
from pathlib import Path

import numpy as np
import parselmouth

from app.audio import limit_true_peak, measure_true_peak

RATE = 44100


def write(path: Path, signal: np.ndarray) -> Path:
    parselmouth.Sound(signal, sampling_frequency=RATE).save(str(path), "WAV")
    return path


class TruePeakTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)

    def test_inter_sample_peaks_are_limited(self):
        # A quarter-sample-rate sine offset by 45 degrees: every sample sits at ~0.70 of the
        # waveform's true peak, so sample-peak meters miss the overs that playback produces.
        times = np.arange(3 * RATE) / RATE
        hot = write(self.root / "hot.wav", 0.999 * np.sin(2 * math.pi * (RATE / 4) * times + math.pi / 4))
        self.assertLess(float(np.max(np.abs(parselmouth.Sound(str(hot)).values))), 0.75)
        self.assertGreater(measure_true_peak(hot), -1.0)
        limited = limit_true_peak(hot, self.root / "limited.wav")
        self.assertNotEqual(limited, hot)
        self.assertLessEqual(measure_true_peak(limited), -1.0)
        self.assertAlmostEqual(parselmouth.Sound(str(limited)).duration, 3.0, delta=0.01)

    def test_loud_music_like_signal_is_limited_without_losing_level(self):
        times = np.arange(4 * RATE) / RATE
        signal = sum(np.sin(2 * math.pi * f * times) / n for n, f in enumerate((110, 220, 330, 1760, 5000), 1))
        hot = write(self.root / "music.wav", signal / np.max(np.abs(signal)) * 0.999)
        limited = limit_true_peak(hot, self.root / "limited.wav")
        self.assertLessEqual(measure_true_peak(limited), -1.0)
        loss = 20 * math.log10(np.sqrt(np.mean(parselmouth.Sound(str(hot)).values ** 2)) / np.sqrt(np.mean(parselmouth.Sound(str(limited)).values ** 2)))
        self.assertLess(loss, 2.5, "limiting should shave peaks, not turn the track down")

    def test_safe_audio_passes_through_untouched(self):
        times = np.arange(RATE) / RATE
        quiet = write(self.root / "quiet.wav", 0.3 * np.sin(2 * math.pi * 440 * times))
        self.assertIs(limit_true_peak(quiet, self.root / "unused.wav"), quiet)
        self.assertFalse((self.root / "unused.wav").exists())


if __name__ == "__main__":
    unittest.main()
