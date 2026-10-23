"""Local audio finishing helpers built on FFmpeg."""

import json
import re
import subprocess
from pathlib import Path


def finish_loudness(source: Path, target: Path, target_lufs: float, true_peak: float = -1.0) -> Path:
    """Normalize to an integrated loudness with a true-peak ceiling using two-pass loudnorm."""
    settings = f"I={target_lufs}:TP={true_peak}:LRA=11"
    analysis = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(source), "-af", f"loudnorm={settings}:print_format=json", "-f", "null", "-"],
        check=True,
        capture_output=True,
        text=True,
        timeout=600,
    )
    match = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", analysis.stderr)
    if match:
        measured = json.loads(match.group(0))
        settings += (
            f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
            f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
            f":offset={measured['target_offset']}:linear=true"
        )
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-af", f"loudnorm={settings}", "-ar", "48000", "-c:a", "pcm_s24le", str(target)],
        check=True,
        capture_output=True,
        timeout=600,
    )
    return target
