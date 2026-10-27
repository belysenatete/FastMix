import os

import psycopg
from fastapi import APIRouter, Depends, HTTPException
from psycopg.rows import dict_row

from .plans import usage_summary
from .uploads import database_url, require_internal_app, storage_client

router = APIRouter(prefix="/api/account", tags=["account"])


def delete_prefix(client, bucket: str, prefix: str) -> int:
    """Remove every stored object under a prefix and return how many were deleted."""
    deleted = 0
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix):
        keys = [{"Key": item["Key"]} for item in page.get("Contents", [])]
        if keys:
            client.delete_objects(Bucket=bucket, Delete={"Objects": keys, "Quiet": True})
            deleted += len(keys)
    return deleted


@router.delete("")
def delete_account(user_id: str = Depends(require_internal_app)):
    """Delete the account's audio and every database row it owns. Safe to repeat."""
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        user = connection.execute("SELECT id FROM users WHERE clerk_user_id = %s FOR UPDATE", (user_id,)).fetchone()
        if not user:
            return {"ok": True, "deletedFiles": 0}
        if connection.execute(
            "SELECT 1 FROM processing_jobs j JOIN projects p ON p.id = j.project_id WHERE p.user_id = %s AND j.status IN ('queued', 'processing') LIMIT 1",
            (user["id"],),
        ).fetchone():
            raise HTTPException(status_code=409, detail="A mix is still processing. Wait for it to finish, then delete your account.")
        projects = connection.execute("SELECT id FROM projects WHERE user_id = %s", (user["id"],)).fetchall()
        # Uploads live under users/<id>/ and rendered outputs (and their MP3 copies) under projects/<id>/.
        prefixes = [f"users/{user['id']}/", *(f"projects/{project['id']}/" for project in projects)]
        client, bucket = storage_client(), os.environ["S3_BUCKET"]
        try:
            deleted = sum(delete_prefix(client, bucket, prefix) for prefix in prefixes)
        except Exception as error:
            raise HTTPException(status_code=503, detail="Some of your audio could not be removed. Your account is still open; please retry.") from error
        # Cascades to projects, tracks, jobs, outputs, subscriptions and usage. Once billing is live,
        # cancel the subscription first and keep invoices for the period the privacy policy states.
        connection.execute("DELETE FROM users WHERE id = %s", (user["id"],))
    return {"ok": True, "deletedFiles": deleted}


@router.get("/usage")
def get_usage(user_id: str = Depends(require_internal_app)):
    """The account's plan, what it allows and what it has used."""
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        user = connection.execute("SELECT id FROM users WHERE clerk_user_id = %s", (user_id,)).fetchone()
        return usage_summary(connection, user["id"] if user else None)
