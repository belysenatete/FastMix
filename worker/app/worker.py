import logging
import os
import subprocess
import tempfile
import time
import uuid
from pathlib import Path

import boto3
import psycopg
import redis
from botocore.config import Config
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .jobs import QUEUE_NAME
from .alerts import HEARTBEAT_KEY, alert
from .plans import release
from .uploads import database_url
from .roex import RoExError, create_full as create_roex_full, create_preview as create_roex_preview
from .audio import LOUDNESS_TARGET_LUFS, finish_loudness, local_mix_graph
from .direction import settings_from_prompt
from .vocals import VOCAL_CATEGORIES, autotune

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("fastmix.processor")
CONTENT_TYPES = {"wav": "audio/wav", "mp3": "audio/mpeg", "flac": "audio/flac"}


def db_connection():
    return psycopg.connect(database_url(), row_factory=dict_row)


def redis_connection():
    return redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), socket_timeout=10, decode_responses=True)


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ["S3_ENDPOINT_URL"],
        aws_access_key_id=os.environ["S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["S3_SECRET_KEY"],
        region_name=os.getenv("S3_REGION", "us-east-1"),
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def update_job(job_id: uuid.UUID, progress: int, status: str | None = None):
    with db_connection() as connection:
        if status:
            connection.execute("UPDATE processing_jobs SET status = %s, progress = %s, updated_at = now() WHERE id = %s", (status, progress, job_id))
        else:
            connection.execute("UPDATE processing_jobs SET progress = %s, updated_at = now() WHERE id = %s", (progress, job_id))


def save_provider_data(job_id: uuid.UUID, provider_data: dict):
    with db_connection() as connection:
        connection.execute("UPDATE processing_jobs SET provider_data = %s, updated_at = now() WHERE id = %s", (Jsonb(provider_data), job_id))


def mark_failed(job_id: uuid.UUID, project_id: uuid.UUID, error_code: str = "processor_failed"):
    with db_connection() as connection:
        connection.execute(
            "UPDATE processing_jobs SET status = 'failed', error_code = %s, updated_at = now() WHERE id = %s AND status = 'processing'",
            (error_code, job_id),
        )
        release(connection, job_id)
        connection.execute(
            "UPDATE projects SET status = CASE WHEN EXISTS (SELECT 1 FROM processing_jobs WHERE project_id = %s AND status IN ('queued','processing')) THEN 'queued' ELSE 'failed' END, updated_at = now() WHERE id = %s",
            (project_id, project_id),
        )


def claim_job(job_id: uuid.UUID):
    with db_connection() as connection:
        job = connection.execute(
            "UPDATE processing_jobs SET status = 'processing', progress = 3, updated_at = now() WHERE id = %s AND status = 'queued' RETURNING id, project_id, processor, render, source_job_id, provider_data, settings",
            (job_id,),
        ).fetchone()
        if not job:
            return None
        connection.execute("UPDATE projects SET status = 'processing', updated_at = now() WHERE id = %s", (job["project_id"],))
        project = connection.execute("SELECT project_type, prompt FROM projects WHERE id = %s", (job["project_id"],)).fetchone()
        tracks = connection.execute(
            "SELECT id, storage_key, category, original_name FROM tracks WHERE project_id = %s ORDER BY created_at ASC",
            (job["project_id"],),
        ).fetchall()
        provider_data = job["provider_data"]
        if job["render"] == "full" and not provider_data:
            source = connection.execute("SELECT provider_data FROM processing_jobs WHERE id = %s", (job["source_job_id"],)).fetchone()
            provider_data = source["provider_data"] if source else None
    return {
        "id": job["id"],
        "project_id": job["project_id"],
        "project_type": project["project_type"],
        "prompt": project["prompt"],
        # Jobs created before versioned settings fall back to the session direction.
        "settings": job["settings"] or settings_from_prompt(project["prompt"]),
        "processor": job["processor"],
        "render": job["render"],
        "provider_data": provider_data,
        "tracks": tracks,
    }


def render_preview(job: dict, client, bucket: str, temp_dir: Path) -> tuple[Path, str, dict | None]:
    if not job["tracks"]:
        raise ValueError("The session has no tracks")
    if job["project_type"] == "master" and len(job["tracks"]) != 1:
        raise ValueError("Mastering preview requires exactly one finished track")
    source_paths: list[Path] = []
    for index, track in enumerate(job["tracks"]):
        target = temp_dir / f"input-{index}.audio"
        client.download_file(bucket, track["storage_key"], str(target))
        source_paths.append(target)
    update_job(job["id"], 30)

    tuning = job["settings"]["autotune"] if job["project_type"] == "mix" else None
    if tuning:
        for index, track in enumerate(job["tracks"]):
            if track["category"] in VOCAL_CATEGORIES:
                source_paths[index] = autotune(source_paths[index], temp_dir / f"tuned-{index}.wav", tuning["strength"], tuning["scale"])
        logger.info("Applied autotune to vocals for job %s", job["id"])
    update_job(job["id"], 42)

    if job["processor"] == "roex_tonn":
        return create_roex_preview(job, source_paths, temp_dir, lambda progress: update_job(job["id"], progress))

    mixed_path = temp_dir / "local-mix.wav"
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for path in source_paths:
        command.extend(["-i", str(path)])
    graph = local_mix_graph([track["category"] for track in job["tracks"]], job["settings"], VOCAL_CATEGORIES)
    command.extend(["-filter_complex", graph, "-map", "[out]", "-ar", "48000", "-c:a", "pcm_f32le", str(mixed_path)])
    subprocess.run(command, check=True, timeout=600, capture_output=True)
    update_job(job["id"], 70)
    output_path = finish_loudness(mixed_path, temp_dir / "fastmix-preview.wav", LOUDNESS_TARGET_LUFS[job["settings"]["loudness"]])
    update_job(job["id"], 82)
    return output_path, "wav", None


def process_job(job_id: uuid.UUID):
    job = claim_job(job_id)
    if not job:
        return
    try:
        client = s3_client()
        bucket = os.environ["S3_BUCKET"]
        with tempfile.TemporaryDirectory(prefix="fastmix-") as temp_dir:
            provider_data = job["provider_data"]
            if job["render"] == "full":
                if job["processor"] != "roex_tonn" or not provider_data:
                    raise RoExError("Only RoEx AI previews can be rendered at full length")
                output_path, output_format = create_roex_full(
                    provider_data,
                    Path(temp_dir),
                    lambda progress: update_job(job_id, progress),
                    lambda data: save_provider_data(job_id, data),
                )
            else:
                output_path, output_format, provider_data = render_preview(job, client, bucket, Path(temp_dir))

            name = "fastmix-full" if job["render"] == "full" else "fastmix-preview"
            output_key = f"projects/{job['project_id']}/jobs/{job_id}/{name}.{output_format}"
            with output_path.open("rb") as audio:
                client.upload_fileobj(audio, bucket, output_key, ExtraArgs={"ContentType": CONTENT_TYPES[output_format]})
            size = output_path.stat().st_size
            with db_connection() as connection:
                connection.execute(
                    "INSERT INTO outputs (job_id, storage_key, format, size_bytes) VALUES (%s, %s, %s, %s) ON CONFLICT (job_id) DO UPDATE SET storage_key = EXCLUDED.storage_key, format = EXCLUDED.format, size_bytes = EXCLUDED.size_bytes, created_at = now()",
                    (job_id, output_key, output_format, size),
                )
                if provider_data is not None and job["render"] == "preview":
                    connection.execute("UPDATE processing_jobs SET provider_data = %s WHERE id = %s", (Jsonb(provider_data), job_id))
                connection.execute("UPDATE processing_jobs SET status = 'completed', progress = 100, error_code = NULL, updated_at = now() WHERE id = %s", (job_id,))
                connection.execute("UPDATE projects SET status = 'completed', updated_at = now() WHERE id = %s", (job["project_id"],))
        logger.info("Completed %s %s job %s", job["processor"], job["render"], job_id)
    except RoExError as error:
        mark_failed(job_id, job["project_id"], error.code)
        logger.warning("RoEx %s job %s failed (%s): %s", job["render"], job_id, error.code, error)
    except Exception as error:
        mark_failed(job_id, job["project_id"])
        logger.exception("%s processing failed for job %s", job["render"].capitalize(), job_id)
        alert("job_crashed", f"A {job['render']} job ({job_id}) failed with an unexpected {type(error).__name__}. See the processor log.")


def recover_stale_jobs():
    with db_connection() as connection:
        rows = connection.execute(
            "UPDATE processing_jobs SET status = 'queued', progress = 0, updated_at = now() WHERE status = 'queued' OR (status = 'processing' AND updated_at < now() - interval '15 minutes') RETURNING id, project_id"
        ).fetchall()
        for row in rows:
            connection.execute("UPDATE projects SET status = 'queued', updated_at = now() WHERE id = %s", (row["project_id"],))
    if rows:
        queue = redis_connection()
        for row in rows:
            queue.rpush(QUEUE_NAME, str(row["id"]))
        logger.info("Requeued %s stale jobs", len(rows))


def main():
    queue = redis_connection()
    while True:
        try:
            # The API's watchdog reads this to tell a quiet processor from a dead one.
            queue.set(HEARTBEAT_KEY, int(time.time()))
            message = queue.blpop(QUEUE_NAME, timeout=5)
            if message:
                try:
                    process_job(uuid.UUID(message[1]))
                except ValueError:
                    logger.warning("Discarded malformed queue message")
                except Exception:
                    logger.exception("Could not claim a queued job; returning it to the queue")
                    time.sleep(3)
                    queue.rpush(QUEUE_NAME, message[1])
        except Exception:
            logger.exception("Queue connection failed; retrying shortly")
            time.sleep(3)


if __name__ == "__main__":
    recover_stale_jobs()
    main()
