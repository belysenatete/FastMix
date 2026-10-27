#!/usr/bin/env bash
# Disaster recovery: replace the database and audio bucket with a backup.
#   scripts/restore.sh backups/<stamp> --yes
# This OVERWRITES live data. TARGET_DB and TARGET_BUCKET can point it at a scratch copy for drills.
set -euo pipefail
export MSYS_NO_PATHCONV=1

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BACKUP="${1:-}"; BACKUP="${BACKUP%/}"
[ -f "$BACKUP/db.dump" ] && [ -d "$BACKUP/audio" ] || { echo "Usage: scripts/restore.sh backups/<stamp> --yes" >&2; exit 1; }
[ "${2:-}" = "--yes" ] || { echo "This replaces live data with $BACKUP. Re-run with --yes to continue." >&2; exit 1; }
DB="${TARGET_DB:-fastmix}"
BUCKET="${TARGET_BUCKET:-${S3_BUCKET:-fastmix-audio}}"
host_path() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }
live=false; [ "$DB" = "fastmix" ] && live=true

if $live; then
  echo "Stopping the API and processor so nothing writes during the restore..."
  docker compose stop api processor
fi

echo "Restoring the database into '$DB'..."
docker compose exec -T db psql -U fastmix -d postgres -v ON_ERROR_STOP=1 -q \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB' AND pid <> pg_backend_pid()" \
  -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB OWNER fastmix" >/dev/null
docker compose exec -T db pg_restore -U fastmix -d "$DB" --no-owner --exit-on-error < "$BACKUP/db.dump"

echo "Restoring audio into bucket '$BUCKET'..."
docker compose run --rm --no-deps -T -v "$(host_path "$BACKUP/audio"):/backup:ro" --entrypoint sh storage-init -c \
  "mc alias set local http://storage:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null && mc mb --ignore-existing local/$BUCKET >/dev/null && mc mirror --quiet --overwrite --remove /backup local/$BUCKET" >/dev/null

if $live; then
  echo "Starting the API and processor..."
  docker compose up -d api processor >/dev/null
fi
echo "Restored $BACKUP into database '$DB' and bucket '$BUCKET'."
