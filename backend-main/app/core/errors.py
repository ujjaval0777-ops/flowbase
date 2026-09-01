from fastapi import HTTPException
from postgrest.exceptions import APIError


def raise_supabase_error(exc: Exception) -> None:
    message = getattr(exc, "message", None) or str(exc)
    lower = message.lower()

    if "row-level security" in lower or "permission denied" in lower or "policy" in lower:
        raise HTTPException(status_code=403, detail="Database policy denied this operation")

    if "duplicate key" in lower or "already exists" in lower:
        raise HTTPException(status_code=409, detail=message)

    if "not authenticated" in lower or "invalid jwt" in lower:
        raise HTTPException(status_code=401, detail="Authentication required")

    if "insufficient stock" in lower:
        raise HTTPException(status_code=409, detail=message)

    raise HTTPException(status_code=400, detail=message)


def execute_or_400(fn):
    try:
        return fn()
    except APIError as exc:
        raise_supabase_error(exc)
    except HTTPException:
        raise
    except Exception as exc:
        raise_supabase_error(exc)
