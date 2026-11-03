FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir "numpy<2" demucs==4.0.1 soundfile
# bake the htdemucs_ft weights in
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs_ft')"
ENTRYPOINT ["python", "-m", "demucs"]
