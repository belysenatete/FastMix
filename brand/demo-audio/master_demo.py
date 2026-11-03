"""Master the first 29 s of D:/mastering.wav with the real FastMix RoEx mastering preview (free)."""
# Run in the processor image with ROEX_API_KEY set, D: mounted at /in and an output folder at /out:
#   docker run --rm --env-file .env -e PYTHONPATH=/srv/fastmix -v "D:/:/in:ro" -v "<out>:/out" --entrypoint python fastmix-processor /out/master_demo.py "loud and punchy"
import logging, shutil, subprocess, sys
from pathlib import Path
from app.direction import settings_from_prompt
from app.roex import create_preview

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
out = Path("/out"); work = Path("/tmp/demo"); work.mkdir(exist_ok=True)
before = out / "master-before.wav"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-t", "29", "-i", "/in/mastering.wav", "-c:a", "pcm_s16le", str(before)], check=True)
prompt = sys.argv[1]
settings = settings_from_prompt(prompt)
print("settings", settings)
job = {"id": "demo", "project_type": "master", "settings": settings, "tracks": [{"category": "beat"}]}
path, fmt, data = create_preview(job, [before], work, lambda p: print("progress", p))
shutil.copy(path, out / f"master-after-roex.{fmt}")
print("done", fmt, data)
