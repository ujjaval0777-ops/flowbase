from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from .supabase import client_for_access_token, get_public_client

# This creates the OpenAPI/Swagger Bearer authentication scheme.
# Swagger will show an Authorize button and automatically send:
# Authorization: Bearer <token>
security = HTTPBearer(auto_error=False, scheme_name="SupabaseBearer")


def bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authorization must use Bearer authentication",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return credentials.credentials.strip()


def public_supabase() -> Client:
    """Public Supabase client. No Authorization header is required."""
    return get_public_client()


def current_supabase(token: str = Depends(bearer_token)) -> Client:
    """Request-scoped client carrying the user's JWT so RLS applies."""
    return client_for_access_token(token)


def current_user(
    token: str = Depends(bearer_token),
    db: Client = Depends(current_supabase),
):
    try:
        response = db.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": str(response.user.id),
            "email": response.user.email,
            "user": response.user,
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
