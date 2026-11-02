import hmac
import mimetypes
import os
import uuid
from pathlib import PurePath

import boto3
import psycopg
from botocore.config import Config
from fastapi import APIRouter, Depends, Header, HTTPException
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/projects", tags=["tracks"])
# Every upload is stored as generic binary; the signature check on completion decides what it really is.
UPLOAD_CONTENT_TYPE = "application/octet-stream"
UPLOAD_LINK_SECONDS = 900
MAX_AUDIO_BYTES = 100 * 1024 * 1024
MAX_PROJECT_TRACKS = 20
MAX_PROJECT_AUDIO_BYTES = 500 * 1024 * 1024
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


def require_internal_app(x_internal_secret: str | None = Header(default=None), x_user_id: str | None = Header(default=None)):
    expected = os.getenv("INTERNAL_API_SECRET", "")
    if not expected or not x_internal_secret or not hmac.compare_digest(expected, x_internal_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not x_user_id or len(x_user_id) > 255:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return x_user_id


def database_url() -> str:
    value = os.getenv("DATABASE_URL")
    if not value:
        raise HTTPException(status_code=503, detail="Database is not configured")
    return value


def s3_client(endpoint_url: str | None = None):
    # Local MinIO-compatible storage needs path-style URLs; some hosted providers need virtual-hosted style.
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url or os.environ["S3_ENDPOINT_URL"],
        aws_access_key_id=os.environ["S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["S3_SECRET_KEY"],
        region_name=os.getenv("S3_REGION", "us-east-1"),
        config=Config(signature_version="s3v4", s3={"addressing_style": os.getenv("S3_ADDRESSING_STYLE", "path")}),
    )


def storage_client():
    required = ["S3_ENDPOINT_URL", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET"]
    if any(not os.getenv(name) for name in required):
        raise HTTPException(status_code=503, detail="Private audio storage is not configured")
    return s3_client()


def public_storage_client():
    """Client for links the browser opens, which may need a different host than the server uses."""
    public_endpoint = os.getenv("S3_PUBLIC_ENDPOINT_URL")
    return s3_client(public_endpoint) if public_endpoint else storage_client()


def find_owner(connection, user_id: str, project_id: uuid.UUID):
    user = connection.execute("SELECT id FROM users WHERE clerk_user_id = %s", (user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Project not found")
    project = connection.execute("SELECT id FROM projects WHERE id = %s AND user_id = %s", (project_id, user["id"])).fetchone()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return user["id"]


@router.get("/{project_id}/tracks")
def list_tracks(project_id: uuid.UUID, user_id: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, user_id, project_id)
        rows = connection.execute(
            "SELECT id, category, original_name, mime_type, size_bytes, duration_seconds, created_at FROM tracks WHERE project_id = %s ORDER BY created_at ASC",
            (project_id,),
        ).fetchall()
    return {"tracks": rows}


@router.delete("/{project_id}")
def delete_project(project_id: uuid.UUID, user_id: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        owner = connection.execute("SELECT u.id FROM users u JOIN projects p ON p.user_id = u.id WHERE u.clerk_user_id = %s AND p.id = %s FOR UPDATE OF p", (user_id, project_id)).fetchone()
        if not owner:
            raise HTTPException(status_code=404, detail="Project not found")
        active_job = connection.execute("SELECT id FROM processing_jobs WHERE project_id = %s AND status IN ('queued', 'processing') LIMIT 1", (project_id,)).fetchone()
        if active_job:
            raise HTTPException(status_code=409, detail="Wait for the session job to finish before deleting this project")
        track_keys = connection.execute("SELECT storage_key FROM tracks WHERE project_id = %s", (project_id,)).fetchall()
        output_keys = connection.execute(
            "SELECT o.storage_key FROM outputs o JOIN processing_jobs j ON j.id = o.job_id WHERE j.project_id = %s",
            (project_id,),
        ).fetchall()
        # MP3 copies sit next to their WAV (see delivery.ensure_mp3); removing a missing key is a no-op.
        output_keys += [{"storage_key": item["storage_key"].rsplit(".", 1)[0] + ".mp3"} for item in output_keys if item["storage_key"].endswith(".wav")]
        client = storage_client() if track_keys or output_keys else None
        if client:
            for item in [*track_keys, *output_keys]:
                try:
                    client.delete_object(Bucket=os.environ["S3_BUCKET"], Key=item["storage_key"])
                except Exception as error:
                    raise HTTPException(status_code=503, detail="Project audio could not be fully removed. Please retry.") from error
        connection.execute("DELETE FROM projects WHERE id = %s", (project_id,))
    return {"ok": True}


class UploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    category: str
    size_bytes: int


class UploadComplete(BaseModel):
    track_id: uuid.UUID
    filename: str = Field(min_length=1, max_length=255)
    category: str


def track_file(filename: str, category: str) -> tuple[str, str]:
    """Validate a track's category and file type, returning its safe display name and extension."""
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Unknown track category")
    original_name = PurePath(filename).name.replace("\\", "_").replace("/", "_")[:180] or "audio"
    extension = PurePath(original_name).suffix.lower()
    if extension not in FILE_SIGNATURES:
        raise HTTPException(status_code=415, detail="Supported files: WAV, MP3, FLAC, AIFF, M4A, and OGG")
    return original_name, extension


def check_session_room(connection, project_id: uuid.UUID, size_bytes: int):
    """Lock the session and confirm one more track of this size fits while nothing is processing."""
    connection.execute("SELECT id FROM projects WHERE id = %s FOR UPDATE", (project_id,))
    usage = connection.execute("SELECT count(*) AS track_count, COALESCE(sum(size_bytes), 0) AS total_bytes FROM tracks WHERE project_id = %s", (project_id,)).fetchone()
    if usage["track_count"] >= MAX_PROJECT_TRACKS:
        raise HTTPException(status_code=413, detail=f"A session can contain at most {MAX_PROJECT_TRACKS} tracks")
    if usage["total_bytes"] + size_bytes > MAX_PROJECT_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="A session can contain at most 500 MB of audio")
    if connection.execute("SELECT 1 FROM processing_jobs WHERE project_id = %s AND status IN ('queued', 'processing') LIMIT 1", (project_id,)).fetchone():
        raise HTTPException(status_code=409, detail="Wait for processing to finish before changing tracks")


def check_size(size_bytes: int):
    if size_bytes <= 0:
        raise HTTPException(status_code=400, detail="The audio file is empty")
    if size_bytes > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio files must be 100 MB or smaller")


@router.post("/{project_id}/tracks/uploads", status_code=201)
def create_upload(project_id: uuid.UUID, body: UploadRequest, user_id: str = Depends(require_internal_app)):
    """Hand out a short-lived link so the browser sends the audio straight to storage, not through the API."""
    _, extension = track_file(body.filename, body.category)
    check_size(body.size_bytes)
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        owner_id = find_owner(connection, user_id, project_id)
        check_session_room(connection, project_id, body.size_bytes)
    track_id = uuid.uuid4()
    url = public_storage_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": os.environ["S3_BUCKET"], "Key": f"users/{owner_id}/projects/{project_id}/tracks/{track_id}{extension}", "ContentType": UPLOAD_CONTENT_TYPE},
        ExpiresIn=UPLOAD_LINK_SECONDS,
    )
    return {"trackId": track_id, "url": url, "contentType": UPLOAD_CONTENT_TYPE, "expiresIn": UPLOAD_LINK_SECONDS}


@router.post("/{project_id}/tracks", status_code=201)
def complete_upload(project_id: uuid.UUID, body: UploadComplete, user_id: str = Depends(require_internal_app)):
    """Check the file the browser stored, then add it to the session. A file that fails a check is deleted."""
    original_name, extension = track_file(body.filename, body.category)
    client = storage_client()
    bucket = os.environ["S3_BUCKET"]
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        owner_id = find_owner(connection, user_id, project_id)
        storage_key = f"users/{owner_id}/projects/{project_id}/tracks/{body.track_id}{extension}"
        if connection.execute("SELECT 1 FROM tracks WHERE id = %s", (body.track_id,)).fetchone():
            raise HTTPException(status_code=409, detail="This track was already added")
        try:
            size_bytes = client.head_object(Bucket=bucket, Key=storage_key)["ContentLength"]
        except client.exceptions.ClientError as error:
            raise HTTPException(status_code=404, detail="The upload did not reach storage. Please retry.") from error
        try:
            check_size(size_bytes)
            signature = client.get_object(Bucket=bucket, Key=storage_key, Range="bytes=0-31")["Body"].read()
            if not FILE_SIGNATURES[extension](signature):
                raise HTTPException(status_code=415, detail="The file content does not match a supported audio format")
            check_session_room(connection, project_id, size_bytes)
            mime_type = mimetypes.guess_type(original_name)[0] or UPLOAD_CONTENT_TYPE
            row = connection.execute(
                "INSERT INTO tracks (id, project_id, category, original_name, storage_key, mime_type, size_bytes) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, category, original_name, mime_type, size_bytes, created_at",
                (body.track_id, project_id, body.category, original_name, storage_key, mime_type, size_bytes),
            ).fetchone()
            connection.execute("UPDATE projects SET updated_at = now(), status = 'ready' WHERE id = %s", (project_id,))
        except Exception:
            connection.rollback()
            try:
                client.delete_object(Bucket=bucket, Key=storage_key)
            except Exception:
                pass
            raise
    return {"track": row}


@router.delete("/{project_id}/tracks/{track_id}")
def delete_track(project_id: uuid.UUID, track_id: uuid.UUID, user_id: str = Depends(require_internal_app)):
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        find_owner(connection, user_id, project_id)
        connection.execute("SELECT id FROM projects WHERE id = %s FOR UPDATE", (project_id,))
        if connection.execute("SELECT 1 FROM processing_jobs WHERE project_id = %s AND status IN ('queued', 'processing') LIMIT 1", (project_id,)).fetchone():
            raise HTTPException(status_code=409, detail="Wait for processing to finish before changing tracks")
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
