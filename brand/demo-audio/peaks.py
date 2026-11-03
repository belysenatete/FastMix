# Bar heights for the demo waveforms: RMS level per slice in dB (-36..0 dBFS mapped to 0..1), on one absolute scale so a quieter file draws smaller bars.
# Run in the API image with this file and the four MP3s in one folder mounted at /out:
#   docker run --rm -v "<folder>:/out" --entrypoint python fastmix-api /out/peaks.py
# then paste the JSON it prints into web/src/components/demo-waveforms.ts.
import json, subprocess, numpy as np
BARS = 96
out = {}
for name in ["mix-before", "mix-after", "master-before", "master-after"]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"/out/{name}.mp3", "-ac", "1", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.abs(np.frombuffer(raw, dtype=np.float32))
    rms = [np.sqrt(np.mean(np.square(s))) for s in np.array_split(x, BARS)]
    out[name] = [round(float(np.clip((20 * np.log10(max(r, 1e-6)) + 36) / 36, 0.04, 1)), 3) for r in rms]
print(json.dumps(out))
