"""Mix 30 s of the separated vocal and instrumental with the real FastMix RoEx mixing preview (free)."""
# Stems come from Demucs (demucs.Dockerfile; see README), cut to 30 s as mix-vocal-30.wav and mix-beat-30.wav. Run in the processor image with ROEX_API_KEY set and the stems in /out:
#   docker run --rm --env-file .env -e PYTHONPATH=/srv/fastmix -v "<out>:/out" --entrypoint python fastmix-processor /out/mix_demo.py "<prompt>"
# It follows the live preview path (worker.render_preview): local autotune only if the prompt asks, then RoEx.
import logging, shutil, sys
from pathlib import Path
from app.direction import settings_from_prompt
from app.roex import create_preview
from app.vocals import autotune

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
out = Path("/out"); work = Path("/tmp/demo"); work.mkdir(exist_ok=True)
vocal, beat = out / "mix-vocal-30.wav", out / "mix-beat-30.wav"
prompt = sys.argv[1]
settings = settings_from_prompt(prompt)
print("settings", settings)
if settings["autotune"]:
    vocal = autotune(vocal, work / "vocal-tuned.wav", settings["autotune"]["strength"], settings["autotune"]["scale"])
job = {"id": "demo", "project_type": "mix", "settings": settings, "tracks": [{"category": "lead_vocal"}, {"category": "beat"}]}
path, fmt, data = create_preview(job, [vocal, beat], work, lambda p: print("progress", p))
shutil.copy(path, out / f"mix-after-roex.{fmt}")
print("done", fmt, data)
