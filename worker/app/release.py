"""Release step run each time the processor starts: bring the schema up to date and set storage CORS.

Every SQL file is idempotent, so running init.sql and then each migration is safe on a new or existing database.
"""
import logging
import os
from pathlib import Path

import psycopg

from .uploads import database_url, s3_client

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("fastmix.release")
DATABASE_DIR = Path(os.getenv("FASTMIX_DATABASE_DIR", Path(__file__).resolve().parent.parent / "database"))


def migrate():
    files = [DATABASE_DIR / "init.sql", *sorted((DATABASE_DIR / "migrations").glob("*.sql"))]
    with psycopg.connect(database_url(), autocommit=True) as connection:
        for path in files:
            with connection.transaction():
                connection.execute(path.read_text(encoding="utf-8"))
            log.info("applied %s", path.name)


def configure_cors():
    # The browser uploads tracks straight to the bucket and the player loads audio with crossOrigin="anonymous",
    # so the bucket must allow the site's origin to PUT and GET.
    origins = [origin.strip() for origin in os.getenv("S3_CORS_ORIGINS", "").split(",") if origin.strip()]
    if not origins:
        log.info("S3_CORS_ORIGINS is not set; leaving bucket CORS unchanged")
        return
    s3_client().put_bucket_cors(Bucket=os.environ["S3_BUCKET"], CORSConfiguration={"CORSRules": [{
        "AllowedOrigins": origins,
        "AllowedMethods": ["GET", "HEAD", "PUT"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"],
        "MaxAgeSeconds": 3600,
    }]})
    log.info("bucket CORS allows %s", ", ".join(origins))


if __name__ == "__main__":
    migrate()
    try:
        configure_cors()
    except Exception:
        # Some providers manage CORS only in their dashboard; don't keep the processor from starting.
        log.exception("Could not set the bucket's CORS rule; set it in the storage provider's dashboard instead")
