import hashlib
import hmac
import os
import re
import uuid
from pathlib import PurePath

import boto3
import psycopg
from botocore.config import Config
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from psycopg.rows import dict_row

router = APIRouter(prefix="/api/projects", tags=["tracks"])
MAX_AUDIO_BYTES = 100 * 1024 * 1024
CATEGORIES = {"beat", "lead_vocal", "doubles", "backing_vocals", "adlibs", "instrument", "master"}
FILE_SIGNATURES = {
    ".wav": lambda data: data.startswith(b"RIFF") and data[8:12] == b"WAVE",
    ".mp3": lambda data: data.startswith(b"ID3") or (len(data) > 1 and data[0] == 0xFF and data[1] & 0xE0 == 0xE0),
    ".flac": lambda data: data.startswith(b"fLaC"),
    ".aif": lambda data: data.startswith(b"FORM") and data[8:12] in {b"AIFF", b"AIFC"},
    ".aiff": lambda data: data.startswith(b"FORM") and data[8:12] in {b"AIFF", b"AIFC"},
    ".m4a": lambda data: len(data) > 8 and data[4:8] == b"ftyp",
    ".ogg": lambda data: data.startswith(b"OggS"),
}


def require_internal_app(x_internal_secret: str | None = Header(default=None), x_user_email: str | None = Header(default=None)):
    expected = os.getenv("INTERNAL_API_SECRET", "")
    if not expected or not x_internal_secret or not hmac.compare_digest(expected, x_internal_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not x_user_email or len(x_user_email) > 254 or "@" not in x_user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return x_user_email.lower()


def database_url() -> str:
    value = os.getenv("DATABASE_URL")
    if not value:
        raise HTTPException(status_code=503, detail="Database is not configured")
    return value


def storage_client():
    required = ["S3_ENDPOINT_URL", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET"]
    if any(not os.getenv(name) for name in required):
        raise HTTPException(status_code=503, detail="Private audio storage is not configured")
    return boto3.client(
        "s3",
        endpoint_url=os.environ["S3_ENDPOINT_URL"],
        aws_access_key_id=os.environ["S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["S3_SECRET_KEY"],
        region_name=os.getenv("S3_REGION", "us-east-1"),
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def find_owner(connection, email: str, project_id: uuid.UUID):
    user = connection.execute("SELECT id FROM users WHERE email = %s", (email,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Project not found")
    project = connection.execute("SELECT id FROM projects WHERE id = %s AND user_id = %s", (project_id, user["id"])).fetchone()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return user["id"]


@router.get("/{project_id}/tracks")
def list_tracks(project_id: uuid.UUID, email: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, email, project_id)
        rows = connection.execute(
            "SELECT id, category, original_name, mime_type, size_bytes, duration_seconds, created_at FROM tracks WHERE project_id = %s ORDER BY created_at ASC",
            (project_id,),
        ).fetchall()
    return {"tracks": rows}


@router.delete("/{project_id}")
def delete_project(project_id: uuid.UUID, email: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, email, project_id)
        active_job = connection.execute("SELECT id FROM processing_jobs WHERE project_id = %s AND status IN ('queued', 'processing') LIMIT 1", (project_id,)).fetchone()
        if active_job:
            raise HTTPException(status_code=409, detail="Wait for the session job to finish before deleting this project")
        track_keys = connection.execute("SELECT storage_key FROM tracks WHERE project_id = %s", (project_id,)).fetchall()
        output_keys = connection.execute(
            "SELECT o.storage_key FROM outputs o JOIN processing_jobs j ON j.id = o.job_id WHERE j.project_id = %s",
            (project_id,),
        ).fetchall()
        client = storage_client() if track_keys or output_keys else None
        if client:
            for item in [*track_keys, *output_keys]:
                try:
                    client.delete_object(Bucket=os.environ["S3_BUCKET"], Key=item["storage_key"])
                except Exception as error:
                    raise HTTPException(status_code=503, detail="Project audio could not be fully removed. Please retry.") from error
        connection.execute("DELETE FROM projects WHERE id = %s", (project_id,))
    return {"ok": True}


@router.post("/{project_id}/tracks", status_code=201)
def upload_track(
    project_id: uuid.UUID,
    category: str = Form(...),
    file: UploadFile = File(...),
    email: str = Depends(require_internal_app),
):
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Unknown track category")
    original_name = PurePath(file.filename or "audio").name.replace("\\", "_").replace("/", "_")[:180]
    extension = PurePath(original_name).suffix.lower()
    signature_check = FILE_SIGNATURES.get(extension)
    if not signature_check:
        raise HTTPException(status_code=415, detail="Supported files: WAV, MP3, FLAC, AIFF, M4A, and OGG")

    # FastAPI spools multipart data to a temporary file. Inspect the signature and
    # enforce the limit before sending the file to object storage.
    file.file.seek(0)
    signature = file.file.read(32)
    if not signature_check(signature):
        raise HTTPException(status_code=415, detail="The file content does not match a supported audio format")
    file.file.seek(0)
    size_bytes = 0
    digest = hashlib.sha256()
    while chunk := file.file.read(1024 * 1024):
        size_bytes += len(chunk)
        if size_bytes > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="Audio files must be 100 MB or smaller")
        digest.update(chunk)
    if size_bytes == 0:
        raise HTTPException(status_code=400, detail="The audio file is empty")
    file.file.seek(0)

    track_id = uuid.uuid4()
    client = storage_client()
    bucket = os.environ["S3_BUCKET"]
    try:
        with psycopg.connect(database_url(), row_factory=dict_row) as connection:
            owner_id = find_owner(connection, email, project_id)
            storage_key = f"users/{owner_id}/projects/{project_id}/tracks/{track_id}{extension}"
            client.upload_fileobj(file.file, bucket, storage_key, ExtraArgs={"ContentType": file.content_type or "application/octet-stream", "Metadata": {"sha256": digest.hexdigest()}})
            row = connection.execute(
                "INSERT INTO tracks (id, project_id, category, original_name, storage_key, mime_type, size_bytes) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, category, original_name, mime_type, size_bytes, created_at",
                (track_id, project_id, category, original_name, storage_key, file.content_type or "application/octet-stream", size_bytes),
            ).fetchone()
            connection.execute("UPDATE projects SET updated_at = now(), status = 'ready' WHERE id = %s", (project_id,))
    except HTTPException:
        raise
    except Exception as error:
        try:
            if "storage_key" in locals():
                client.delete_object(Bucket=bucket, Key=storage_key)
        except Exception:
            pass
        raise HTTPException(status_code=503, detail="Audio could not be stored. Please retry.") from error

    return {"track": row}


@router.delete("/{project_id}/tracks/{track_id}")
def delete_track(project_id: uuid.UUID, track_id: uuid.UUID, email: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, email, project_id)
        row = connection.execute(
            "SELECT storage_key FROM tracks WHERE id = %s AND project_id = %s",
            (track_id, project_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Track not found")
        try:
            storage_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=row["storage_key"])
        except Exception as error:
            raise HTTPException(status_code=503, detail="Stored audio could not be removed. Please retry.") from error
        connection.execute("DELETE FROM tracks WHERE id = %s AND project_id = %s", (track_id, project_id))
        connection.execute("UPDATE projects SET updated_at = now() WHERE id = %s", (project_id,))
    return {"ok": True}
