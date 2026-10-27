#!/usr/bin/env bash
# Prove a backup can be restored without touching live data:
# restores db.dump into a scratch database, compares row counts with the live database,
# and compares the audio file count with the live bucket. Usage: scripts/restore-check.sh [backups/<stamp>]
set -euo pipefail
export MSYS_NO_PATHCONV=1

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BACKUP="${1:-$(ls -1d backups/*/ 2>/dev/null | sort | tail -1)}"
BACKUP="${BACKUP%/}"
[ -f "$BACKUP/db.dump" ] || { echo "No backup found. Run scripts/backup.sh first." >&2; exit 1; }
BUCKET="${S3_BUCKET:-fastmix-audio}"
SCRATCH="fastmix_restore_check"
TABLES="users projects tracks processing_jobs outputs subscriptions invoices usage_events"
psql() { docker compose exec -T db psql -U fastmix -v ON_ERROR_STOP=1 -qtA "$@"; }

echo "Restoring $BACKUP/db.dump into a scratch database..."
psql -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH" -c "CREATE DATABASE $SCRATCH"
trap 'psql -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH" >/dev/null' EXIT
docker compose exec -T db pg_restore -U fastmix -d "$SCRATCH" --no-owner --exit-on-error < "$BACKUP/db.dump"

status=0
for table in $TABLES; do
  restored="$(psql -d "$SCRATCH" -c "SELECT count(*) FROM $table")"
  live="$(psql -d fastmix -c "SELECT count(*) FROM $table")"
  mark="ok"; [ "$restored" = "$live" ] || mark="differs (changed since the backup?)"
  printf '  %-16s backup %-6s live %-6s %s\n' "$table" "$restored" "$live" "$mark"
done

backup_files="$(find "$BACKUP/audio" -type f | wc -l | tr -d ' ')"
live_files="$(docker compose run --rm --no-deps -T --entrypoint sh storage-init -c \
  "mc alias set local http://storage:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null && mc ls --recursive local/$BUCKET | wc -l" 2>/dev/null | tr -d ' \r')"
printf '  %-16s backup %-6s live %-6s\n' "audio files" "$backup_files" "$live_files"

# Every stored file the restored database points to must exist in the backup.
missing=0
while read -r key; do
  [ -z "$key" ] && continue
  [ -f "$BACKUP/audio/$key" ] || { missing=$((missing + 1)); echo "  missing: $key"; }
done < <(psql -d "$SCRATCH" -c "SELECT storage_key FROM tracks UNION ALL SELECT storage_key FROM outputs" | tr -d '\r')
if [ "$missing" -eq 0 ]; then echo "Restore check passed: the database restores and every referenced audio file is in the backup."
else echo "Restore check FAILED: $missing referenced audio files are missing from the backup." >&2; status=1; fi
exit $status
