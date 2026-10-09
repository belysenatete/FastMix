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

from .jobs import QUEUE_NAME
from .uploads import database_url

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("fastmix.processor")


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


def mark_failed(job_id: uuid.UUID, project_id: uuid.UUID):
    with db_connection() as connection:
        connection.execute(
            "UPDATE processing_jobs SET status = 'failed', error_code = 'processor_failed', updated_at = now() WHERE id = %s AND status = 'processing'",
            (job_id,),
        )
        connection.execute(
            "UPDATE projects SET status = CASE WHEN EXISTS (SELECT 1 FROM processing_jobs WHERE project_id = %s AND status IN ('queued','processing')) THEN 'queued' ELSE 'failed' END, updated_at = now() WHERE id = %s",
            (project_id, project_id),
        )


def claim_job(job_id: uuid.UUID):
    with db_connection() as connection:
        job = connection.execute(
            "UPDATE processing_jobs SET status = 'processing', progress = 3, updated_at = now() WHERE id = %s AND status = 'queued' RETURNING id, project_id",
            (job_id,),
        ).fetchone()
        if not job:
            return None
        connection.execute("UPDATE projects SET status = 'processing', updated_at = now() WHERE id = %s", (job["project_id"],))
        project = connection.execute("SELECT project_type FROM projects WHERE id = %s", (job["project_id"],)).fetchone()
        tracks = connection.execute(
            "SELECT id, storage_key, category, original_name FROM tracks WHERE project_id = %s ORDER BY created_at ASC",
            (job["project_id"],),
        ).fetchall()
    return {"id": job["id"], "project_id": job["project_id"], "project_type": project["project_type"], "tracks": tracks}


def process_job(job_id: uuid.UUID):
    job = claim_job(job_id)
    if not job:
        return
    try:
        if not job["tracks"]:
            raise ValueError("The session has no tracks")
        if job["project_type"] == "master" and len(job["tracks"]) != 1:
            raise ValueError("Mastering preview requires exactly one finished track")
        client = s3_client()
        bucket = os.environ["S3_BUCKET"]
        with tempfile.TemporaryDirectory(prefix="fastmix-") as temp_dir:
            source_paths: list[Path] = []
            for index, track in enumerate(job["tracks"]):
                target = Path(temp_dir) / f"input-{index}.audio"
                client.download_file(bucket, track["storage_key"], str(target))
                source_paths.append(target)
            update_job(job_id, 42)

            output_path = Path(temp_dir) / "fastmix-preview.wav"
            command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
            for path in source_paths:
                command.extend(["-i", str(path)])
            count = len(source_paths)
            input_labels = "".join(f"[{index}:a]" for index in range(count))
            mix = f"amix=inputs={count}:duration=longest:dropout_transition=2" if count > 1 else "anull"
            graph = f"{input_labels}{mix},loudnorm=I=-14:LRA=11:TP=-1.5[out]"
            command.extend(["-filter_complex", graph, "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s24le", str(output_path)])
            subprocess.run(command, check=True, timeout=600, capture_output=True)
            update_job(job_id, 82)

            output_key = f"projects/{job['project_id']}/jobs/{job_id}/fastmix-preview.wav"
            with output_path.open("rb") as audio:
                client.upload_fileobj(audio, bucket, output_key, ExtraArgs={"ContentType": "audio/wav"})
            size = output_path.stat().st_size
            with db_connection() as connection:
                connection.execute(
                    "INSERT INTO outputs (job_id, storage_key, format, size_bytes) VALUES (%s, %s, 'wav', %s) ON CONFLICT (job_id) DO UPDATE SET storage_key = EXCLUDED.storage_key, format = EXCLUDED.format, size_bytes = EXCLUDED.size_bytes, created_at = now()",
                    (job_id, output_key, size),
                )
                connection.execute("UPDATE processing_jobs SET status = 'completed', progress = 100, error_code = NULL, updated_at = now() WHERE id = %s", (job_id,))
                connection.execute("UPDATE projects SET status = 'completed', updated_at = now() WHERE id = %s", (job["project_id"],))
        logger.info("Completed local preview job %s", job_id)
    except Exception:
        mark_failed(job_id, job["project_id"])
        logger.exception("Local preview processing failed for job %s", job_id)


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
        logger.info("Requeued %s stale preview jobs", len(rows))


def main():
    queue = redis_connection()
    while True:
        try:
            message = queue.blpop(QUEUE_NAME, timeout=5)
            if message:
                try:
                    process_job(uuid.UUID(message[1]))
                except ValueError:
                    logger.warning("Discarded malformed queue message")
                except Exception:
                    logger.exception("Could not claim a queued preview job; returning it to the queue")
                    time.sleep(3)
                    queue.rpush(QUEUE_NAME, message[1])
        except Exception:
            logger.exception("Queue connection failed; retrying shortly")
            time.sleep(3)


if __name__ == "__main__":
    recover_stale_jobs()
    main()
