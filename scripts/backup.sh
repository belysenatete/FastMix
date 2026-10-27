#!/usr/bin/env bash
# Back up the FastMix database and audio storage into backups/<UTC timestamp>/.
#   db.dump   PostgreSQL custom-format dump (pg_restore)
#   audio/    mirror of the audio bucket
# Keeps the newest $KEEP backups (default 14). Run from anywhere; needs the Compose stack running.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash on Windows: don't rewrite container paths.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
KEEP="${KEEP:-14}"
BUCKET="${S3_BUCKET:-fastmix-audio}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="backups/$STAMP"
mkdir -p "$TARGET/audio"
# Docker on Windows needs a Windows-style path for bind mounts.
host_path() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }

echo "Backing up the database..."
docker compose exec -T db pg_dump -U fastmix -d fastmix -Fc > "$TARGET/db.dump"

echo "Backing up audio storage..."
docker compose run --rm --no-deps -T -v "$(host_path "$TARGET/audio"):/backup" --entrypoint sh storage-init -c \
  "mc alias set local http://storage:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null && mc mirror --quiet --overwrite local/$BUCKET /backup" >/dev/null

files="$(find "$TARGET/audio" -type f | wc -l | tr -d ' ')"
echo "Saved $TARGET: database $(du -h "$TARGET/db.dump" | cut -f1), $files audio files."

# Drop the oldest backups beyond $KEEP.
ls -1d backups/*/ 2>/dev/null | sort | head -n -"$KEEP" | while read -r old; do rm -rf -- "$old"; echo "Removed old backup $old"; done
