from fastapi import APIRouter, Depends
import psycopg
from psycopg.rows import dict_row

from .plans import usage_summary
from .uploads import database_url, require_internal_app

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/usage")
def get_usage(user_id: str = Depends(require_internal_app)):
    """The account's plan, what it allows and what it has used."""
    with psycopg.connect(database_url(), row_factory=dict_row) as connection:
        user = connection.execute("SELECT id FROM users WHERE clerk_user_id = %s", (user_id,)).fetchone()
        return usage_summary(connection, user["id"] if user else None)
