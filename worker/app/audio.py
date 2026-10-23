"""Local audio finishing helpers built on FFmpeg."""

import json
import re
import subprocess
from pathlib import Path


LOUDNESS_TARGET_LUFS = {"LOW": -14.0, "MEDIUM": -11.0, "HIGH": -9.0}
# Basic multi-tap echoes standing in for vocal reverb in the local engine.
LOCAL_REVERB = {
    "LOW": "aecho=0.9:0.7:40|70:0.22|0.14",
    "MEDIUM": "aecho=0.9:0.7:50|90|130:0.3|0.22|0.15",
    "HIGH": "aecho=0.85:0.7:60|110|170|240:0.4|0.3|0.22|0.15",
}


def local_mix_graph(categories: list[str], settings: dict, vocal_categories: set[str]) -> str:
    """FFmpeg filter graph that applies vocal level and reverb, then sums the tracks."""
    chains = []
    for index, category in enumerate(categories):
        effects = []
        if category in vocal_categories:
            if settings["vocal_gain_db"]:
                effects.append(f"volume={settings['vocal_gain_db']}dB")
            if settings["reverb"] in LOCAL_REVERB:
                effects.append(LOCAL_REVERB[settings["reverb"]])
        chains.append(f"[{index}:a]{','.join(effects) or 'anull'}[t{index}]")
    labels = "".join(f"[t{index}]" for index in range(len(categories)))
    # normalize=0 keeps relative levels; loudness finishing sets the final level afterwards.
    mix = f"{labels}amix=inputs={len(categories)}:duration=longest:dropout_transition=2:normalize=0[out]" if len(categories) > 1 else f"{labels}anull[out]"
    return ";".join([*chains, mix])


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
