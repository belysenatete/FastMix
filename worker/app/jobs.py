import os
import uuid

import psycopg
import redis
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row

from .uploads import database_url, find_owner, require_internal_app, storage_client

router = APIRouter(prefix="/api/projects", tags=["jobs"])
QUEUE_NAME = "fastmix:jobs"


def queue_client():
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise HTTPException(status_code=503, detail="The local job queue is not configured")
    return redis.Redis.from_url(redis_url, socket_timeout=5, decode_responses=True)


@router.post("/{project_id}/jobs", status_code=202)
def create_job(project_id: uuid.UUID, email: str = Depends(require_internal_app)):
    job_id = uuid.uuid4()
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, email, project_id)
        project = connection.execute("SELECT id, prompt, project_type, status FROM projects WHERE id = %s FOR UPDATE", (project_id,)).fetchone()
        if not project or not project["prompt"].strip():
            raise HTTPException(status_code=400, detail="Add a mix direction before processing")
        if project["status"] in {"queued", "processing"}:
            raise HTTPException(status_code=409, detail="A session job is already in progress")
        tracks = connection.execute("SELECT count(*) AS total FROM tracks WHERE project_id = %s", (project_id,)).fetchone()["total"]
        if tracks < 1:
            raise HTTPException(status_code=400, detail="Add at least one audio track before processing")
        if project["project_type"] == "master" and tracks != 1:
            raise HTTPException(status_code=400, detail="A mastering preview needs exactly one finished track")
        job = connection.execute(
            "INSERT INTO processing_jobs (id, project_id, status, progress, processor) VALUES (%s, %s, 'queued', 0, 'ffmpeg_preview') RETURNING id, project_id, status, progress, processor, attempt, created_at, updated_at",
            (job_id, project_id),
        ).fetchone()
        connection.execute("UPDATE projects SET status = 'queued', updated_at = now() WHERE id = %s", (project_id,))
    try:
        queue_client().rpush(QUEUE_NAME, str(job_id))
    except Exception as error:
        with psycopg.connect(database_url()) as connection:
            connection.execute("UPDATE processing_jobs SET status = 'failed', error_code = 'queue_unavailable', updated_at = now() WHERE id = %s", (job_id,))
            connection.execute("UPDATE projects SET status = 'failed', updated_at = now() WHERE id = %s", (project_id,))
        raise HTTPException(status_code=503, detail="The preview processor is unavailable. Please retry shortly.") from error
    return {"job": job}


@router.get("/{project_id}/jobs")
def list_jobs(project_id: uuid.UUID, email: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, email, project_id)
        jobs = connection.execute(
            "SELECT j.id, j.project_id, j.status, j.progress, j.processor, j.attempt, j.error_code, j.created_at, j.updated_at, o.format AS output_format, o.size_bytes AS output_size_bytes FROM processing_jobs j LEFT JOIN outputs o ON o.job_id = j.id WHERE j.project_id = %s ORDER BY j.created_at DESC LIMIT 20",
            (project_id,),
        ).fetchall()
    return {"jobs": jobs}


@router.get("/{project_id}/jobs/{job_id}")
def get_job(project_id: uuid.UUID, job_id: uuid.UUID, email: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, email, project_id)
        job = connection.execute(
            "SELECT j.id, j.project_id, j.status, j.progress, j.processor, j.attempt, j.error_code, j.created_at, j.updated_at, o.format AS output_format, o.size_bytes AS output_size_bytes FROM processing_jobs j LEFT JOIN outputs o ON o.job_id = j.id WHERE j.project_id = %s AND j.id = %s",
            (project_id, job_id),
        ).fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    return {"job": job}


@router.post("/{project_id}/jobs/{job_id}/retry", status_code=202)
def retry_job(project_id: uuid.UUID, job_id: uuid.UUID, email: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, email, project_id)
        job = connection.execute(
            "UPDATE processing_jobs SET status = 'queued', progress = 0, error_code = NULL, attempt = attempt + 1, updated_at = now() WHERE project_id = %s AND id = %s AND status = 'failed' RETURNING id, project_id, status, progress, processor, attempt, created_at, updated_at",
            (project_id, job_id),
        ).fetchone()
        if not job:
            raise HTTPException(status_code=409, detail="Only a failed job can be retried")
        connection.execute("UPDATE projects SET status = 'queued', updated_at = now() WHERE id = %s", (project_id,))
    try:
        queue_client().rpush(QUEUE_NAME, str(job_id))
    except Exception as error:
        with psycopg.connect(database_url()) as connection:
            connection.execute("UPDATE processing_jobs SET status = 'failed', error_code = 'queue_unavailable', updated_at = now() WHERE id = %s", (job_id,))
            connection.execute("UPDATE projects SET status = 'failed', updated_at = now() WHERE id = %s", (project_id,))
        raise HTTPException(status_code=503, detail="The preview processor is unavailable. Please retry shortly.") from error
    return {"job": job}


@router.get("/{project_id}/jobs/{job_id}/download")
def download_output(project_id: uuid.UUID, job_id: uuid.UUID, inline: bool = Query(default=False), email: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, email, project_id)
        output = connection.execute(
            "SELECT o.storage_key, o.format FROM outputs o JOIN processing_jobs j ON j.id = o.job_id WHERE j.id = %s AND j.project_id = %s AND j.status = 'completed'",
            (job_id, project_id),
        ).fetchone()
    if not output:
        raise HTTPException(status_code=404, detail="No completed output is available")
    client = storage_client()
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
        Params={"Bucket": os.environ["S3_BUCKET"], "Key": output["storage_key"], "ResponseContentDisposition": f"{'inline' if inline else 'attachment'}; filename=fastmix-preview.{output['format']}"},
        ExpiresIn=900,
    )
    return {"url": url, "expiresIn": 900}
