import os
import subprocess
import tempfile
import uuid
from pathlib import Path

import psycopg
import redis
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from .audio import STREAMING_TRUE_PEAK_DB, measure_true_peak
from .direction import describe, refine, settings_from_prompt
from .plans import PLANS, claim_full_track, claim_preview, plan_for, release
from .uploads import database_url, find_owner, require_internal_app, storage_client

router = APIRouter(prefix="/api/projects", tags=["jobs"])
QUEUE_NAME = "fastmix:jobs"
JOB_SELECT = (
    "SELECT j.id, j.project_id, j.status, j.progress, j.processor, j.attempt, j.error_code, j.render, j.source_job_id, "
    "j.settings, j.refinement, j.created_at, j.updated_at, o.format AS output_format, o.size_bytes AS output_size_bytes "
    "FROM processing_jobs j LEFT JOIN outputs o ON o.job_id = j.id"
)
REFINE_HELP = (
    "FastMix couldn't find a change in that note. Try things like \"vocal louder\", \"more reverb\", "
    "\"less autotune\", \"harder autotune in A minor\", \"louder\", \"more dynamic\" or a style such as \"make it drill\"."
)


class RefineRequest(BaseModel):
    note: str = Field(min_length=1, max_length=500)


def queue_client():
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise HTTPException(status_code=503, detail="The local job queue is not configured")
    return redis.Redis.from_url(redis_url, socket_timeout=5, decode_responses=True)


def enqueue(job_id: uuid.UUID, project_id: uuid.UUID):
    """Dispatch a queued job, or fail it visibly when the queue is down so the project is not left stuck."""
    try:
        queue_client().rpush(QUEUE_NAME, str(job_id))
    except Exception as error:
        with psycopg.connect(database_url()) as connection:
            connection.execute("UPDATE processing_jobs SET status = 'failed', error_code = 'queue_unavailable', updated_at = now() WHERE id = %s", (job_id,))
            release(connection, job_id)
            connection.execute("UPDATE projects SET status = 'failed', updated_at = now() WHERE id = %s", (project_id,))
        raise HTTPException(status_code=503, detail="The preview processor is unavailable. Please retry shortly.") from error


def present(job: dict) -> dict:
    return {**job, "summary": describe(job["settings"])}


def fetch_job(connection, project_id: uuid.UUID, job_id: uuid.UUID) -> dict | None:
    job = connection.execute(f"{JOB_SELECT} WHERE j.project_id = %s AND j.id = %s", (project_id, job_id)).fetchone()
    return present(job) if job else None


def current_processor() -> str:
    return "roex_tonn" if os.getenv("ROEX_ENABLED", "").strip().lower() == "true" else "ffmpeg_preview"


def lock_ready_project(connection, project_id: uuid.UUID, processor: str) -> dict:
    """Lock the project and check it can start a new preview version with this processor."""
    project = connection.execute("SELECT id, prompt, project_type, status FROM projects WHERE id = %s FOR UPDATE", (project_id,)).fetchone()
    if not project or not project["prompt"].strip():
        raise HTTPException(status_code=400, detail="Add a mix direction before processing")
    if connection.execute("SELECT 1 FROM processing_jobs WHERE project_id = %s AND status IN ('queued', 'processing') LIMIT 1", (project_id,)).fetchone():
        raise HTTPException(status_code=409, detail="A session job is already in progress")
    tracks = connection.execute("SELECT count(*) AS total FROM tracks WHERE project_id = %s", (project_id,)).fetchone()["total"]
    if tracks < 1:
        raise HTTPException(status_code=400, detail="Add at least one audio track before processing")
    if processor == "roex_tonn" and project["project_type"] != "master" and tracks < 2:
        raise HTTPException(status_code=400, detail="AI mixing needs at least two separate tracks. Add another track or remove ROEX_API_KEY to use the local preview processor.")
    if project["project_type"] == "master" and tracks != 1:
        raise HTTPException(status_code=400, detail="A mastering preview needs exactly one finished track")
    return project


def insert_preview(connection, project_id: uuid.UUID, processor: str, settings: dict, refinement: str | None = None) -> uuid.UUID:
    job_id = uuid.uuid4()
    connection.execute(
        "INSERT INTO processing_jobs (id, project_id, status, progress, processor, settings, refinement) VALUES (%s, %s, 'queued', 0, %s, %s, %s)",
        (job_id, project_id, processor, Jsonb(settings), refinement),
    )
    connection.execute("UPDATE projects SET status = 'queued', updated_at = now() WHERE id = %s", (project_id,))
    return job_id


@router.post("/{project_id}/jobs", status_code=202)
def create_job(project_id: uuid.UUID, user_id: str = Depends(require_internal_app)):
    processor = current_processor()
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        owner = find_owner(connection, user_id, project_id)
        project = lock_ready_project(connection, project_id, processor)
        job_id = insert_preview(connection, project_id, processor, settings_from_prompt(project["prompt"]))
        claim_preview(connection, owner, job_id)
        job = fetch_job(connection, project_id, job_id)
    enqueue(job_id, project_id)
    return {"job": job}


@router.post("/{project_id}/jobs/{job_id}/refine", status_code=202)
def refine_job(project_id: uuid.UUID, job_id: uuid.UUID, request: RefineRequest, user_id: str = Depends(require_internal_app)):
    """Create a new preview version from a finished one, adjusted by the artist's note."""
    note = request.note.strip()
    if not note:
        raise HTTPException(status_code=422, detail="Describe what should change in the next version")
    processor = current_processor()
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        owner = find_owner(connection, user_id, project_id)
        project = lock_ready_project(connection, project_id, processor)
        source = connection.execute(
            "SELECT j.status, j.settings, s.settings AS source_settings FROM processing_jobs j LEFT JOIN processing_jobs s ON s.id = j.source_job_id WHERE j.id = %s AND j.project_id = %s",
            (job_id, project_id),
        ).fetchone()
        if not source:
            raise HTTPException(status_code=404, detail="Processing job not found")
        if source["status"] != "completed":
            raise HTTPException(status_code=409, detail="Only a finished version can be refined")
        # Full renders inherit their preview's settings; versions made before settings existed use the direction.
        base = source["settings"] or source["source_settings"] or settings_from_prompt(project["prompt"])
        settings, changes = refine(base, note)
        if not changes:
            raise HTTPException(status_code=422, detail=REFINE_HELP)
        new_job_id = insert_preview(connection, project_id, processor, settings, note)
        claim_preview(connection, owner, new_job_id)
        job = fetch_job(connection, project_id, new_job_id)
    enqueue(new_job_id, project_id)
    return {"job": job, "changes": changes}


@router.post("/{project_id}/jobs/{job_id}/full", status_code=202)
def create_full_render(project_id: uuid.UUID, job_id: uuid.UUID, user_id: str = Depends(require_internal_app)):
    """Render a completed AI preview at full length. Spends provider credits once per preview."""
    full_job_id = uuid.uuid4()
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        owner = find_owner(connection, user_id, project_id)
        connection.execute("SELECT id FROM projects WHERE id = %s FOR UPDATE", (project_id,))
        source = connection.execute(
            "SELECT id, status, processor, render, provider_data, settings FROM processing_jobs WHERE id = %s AND project_id = %s",
            (job_id, project_id),
        ).fetchone()
        if not source:
            raise HTTPException(status_code=404, detail="Processing job not found")
        if source["render"] != "preview" or source["processor"] != "roex_tonn" or source["status"] != "completed" or not source["provider_data"]:
            raise HTTPException(status_code=409, detail="Only a completed AI preview can be rendered as a full track")
        existing = connection.execute(f"{JOB_SELECT} WHERE j.source_job_id = %s AND j.render = 'full'", (job_id,)).fetchone()
        if existing:
            return {"job": present(existing)}
        if connection.execute("SELECT 1 FROM processing_jobs WHERE project_id = %s AND status IN ('queued', 'processing') LIMIT 1", (project_id,)).fetchone():
            raise HTTPException(status_code=409, detail="A session job is already in progress")
        connection.execute(
            "INSERT INTO processing_jobs (id, project_id, status, progress, processor, render, source_job_id, settings) VALUES (%s, %s, 'queued', 0, 'roex_tonn', 'full', %s, %s)",
            (full_job_id, project_id, job_id, Jsonb(source["settings"]) if source["settings"] else None),
        )
        claim_full_track(connection, owner, full_job_id)
        connection.execute("UPDATE projects SET status = 'queued', updated_at = now() WHERE id = %s", (project_id,))
        job = fetch_job(connection, project_id, full_job_id)
    enqueue(full_job_id, project_id)
    return {"job": job}


@router.get("/{project_id}/jobs")
def list_jobs(project_id: uuid.UUID, user_id: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, user_id, project_id)
        jobs = connection.execute(f"{JOB_SELECT} WHERE j.project_id = %s ORDER BY j.created_at DESC LIMIT 20", (project_id,)).fetchall()
    return {"jobs": [present(job) for job in jobs]}


@router.get("/{project_id}/jobs/{job_id}")
def get_job(project_id: uuid.UUID, job_id: uuid.UUID, user_id: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, user_id, project_id)
        job = fetch_job(connection, project_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    return {"job": job}


@router.post("/{project_id}/jobs/{job_id}/retry", status_code=202)
def retry_job(project_id: uuid.UUID, job_id: uuid.UUID, user_id: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        owner = find_owner(connection, user_id, project_id)
        connection.execute("SELECT id FROM projects WHERE id = %s FOR UPDATE", (project_id,))
        if connection.execute("SELECT 1 FROM processing_jobs WHERE project_id = %s AND status IN ('queued', 'processing') LIMIT 1", (project_id,)).fetchone():
            raise HTTPException(status_code=409, detail="A session job is already in progress")
        retried = connection.execute(
            "UPDATE processing_jobs SET status = 'queued', progress = 0, error_code = NULL, attempt = attempt + 1, updated_at = now() WHERE project_id = %s AND id = %s AND status = 'failed' RETURNING id, render",
            (project_id, job_id),
        ).fetchone()
        if not retried:
            raise HTTPException(status_code=409, detail="Only a failed job can be retried")
        # A failed job gave back what it used, so retrying claims it again.
        (claim_full_track if retried["render"] == "full" else claim_preview)(connection, owner, job_id)
        connection.execute("UPDATE projects SET status = 'queued', updated_at = now() WHERE id = %s", (project_id,))
        job = fetch_job(connection, project_id, job_id)
    enqueue(job_id, project_id)
    return {"job": job}


def delivery_format(stored: str, render: str, allowed: tuple[str, ...], requested: str | None) -> str:
    """Pick the file format to hand out. Previews come as rendered; full tracks follow the plan's formats."""
    if render != "full":
        return stored
    # An account that no longer has a plan keeps access to tracks it already rendered, as MP3.
    allowed = allowed or ("mp3",)
    if requested is None:
        return "wav" if "wav" in allowed and stored == "wav" else "mp3"
    if requested not in allowed:
        raise HTTPException(status_code=403, detail="WAV downloads come with the Artist plan. Download the MP3 instead.")
    if requested == "wav" and stored != "wav":
        raise HTTPException(status_code=404, detail="This track is only available as MP3")
    return requested


def ensure_mp3(client, bucket: str, wav_key: str) -> str:
    """Return the key of a 320 kbps MP3 copy of a stored WAV, creating it on first request."""
    mp3_key = wav_key.rsplit(".", 1)[0] + ".mp3"
    try:
        client.head_object(Bucket=bucket, Key=mp3_key)
        return mp3_key
    except client.exceptions.ClientError:
        pass
    with tempfile.TemporaryDirectory(prefix="fastmix-mp3-") as temp_dir:
        source, target = Path(temp_dir) / "source.wav", Path(temp_dir) / "track.mp3"
        client.download_file(bucket, wav_key, str(source))

        def encode(gain_db: float):
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-af", f"volume={gain_db:.2f}dB", "-c:a", "libmp3lame", "-b:a", "320k", "-ar", "44100", str(target)],
                check=True, timeout=300, capture_output=True,
            )

        encode(0.0)
        # MP3 encoding can push inter-sample peaks above the WAV's; turn it down just enough to stay streaming-safe.
        overshoot = measure_true_peak(target) - STREAMING_TRUE_PEAK_DB
        if overshoot > 0:
            encode(-(overshoot + 0.1))
        client.upload_file(str(target), bucket, mp3_key, ExtraArgs={"ContentType": "audio/mpeg"})
    return mp3_key


@router.get("/{project_id}/jobs/{job_id}/download")
def download_output(
    project_id: uuid.UUID,
    job_id: uuid.UUID,
    inline: bool = Query(default=False),
    requested_format: str | None = Query(default=None, alias="format", pattern="^(mp3|wav)$"),
    user_id: str = Depends(require_internal_app),
):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        owner = find_owner(connection, user_id, project_id)
        output = connection.execute(
            "SELECT o.storage_key, o.format, j.render FROM outputs o JOIN processing_jobs j ON j.id = o.job_id WHERE j.id = %s AND j.project_id = %s AND j.status = 'completed'",
            (job_id, project_id),
        ).fetchone()
        allowed = PLANS[plan_for(connection, owner)]["formats"]
    if not output:
        raise HTTPException(status_code=404, detail="No completed output is available")
    file_format = delivery_format(output["format"], output["render"], allowed, requested_format)
    client = storage_client()
    key = output["storage_key"]
    if file_format != output["format"]:
        try:
            key = ensure_mp3(client, os.environ["S3_BUCKET"], key)
        except Exception as error:
            raise HTTPException(status_code=503, detail="The MP3 could not be prepared. Please retry.") from error
    public_client = client
    public_endpoint = os.getenv("S3_PUBLIC_ENDPOINT_URL")
    if public_endpoint:
        import boto3
        from botocore.config import Config
        public_client = boto3.client(
            "s3",
            endpoint_url=public_endpoint,
            aws_access_key_id=os.environ["S3_ACCESS_KEY"],
            aws_secret_access_key=os.environ["S3_SECRET_KEY"],
            region_name=os.getenv("S3_REGION", "us-east-1"),
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
    url = public_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["S3_BUCKET"], "Key": key, "ResponseContentDisposition": f"{'inline' if inline else 'attachment'}; filename=fastmix-{output['render']}.{file_format}"},
        ExpiresIn=900,
    )
    return {"url": url, "expiresIn": 900, "format": file_format}
