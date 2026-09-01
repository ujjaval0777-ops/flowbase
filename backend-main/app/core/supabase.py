from functools import lru_cache
from supabase import Client, ClientOptions, create_client

from .config import get_settings


@lru_cache
def get_public_client() -> Client:
    settings = get_settings()
    if not settings.public_key:
        raise RuntimeError("SUPABASE_PUBLISHABLE_KEY is not configured")
    return create_client(
        settings.supabase_url,
        settings.public_key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            schema="public",
        ),
    )


@lru_cache
def get_admin_client() -> Client:
    settings = get_settings()
    if not settings.secret_key:
        raise RuntimeError("SUPABASE_SECRET_KEY is required for server-side Auth Admin operations")
    return create_client(
        settings.supabase_url,
        settings.secret_key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            schema="public",
        ),
    )


def client_for_access_token(access_token: str) -> Client:
    # A request-scoped client keeps the caller's JWT attached to PostgREST,
    # so Supabase RLS evaluates auth.uid() as the current user.
    settings = get_settings()
    client = create_client(
        settings.supabase_url,
        settings.public_key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            schema="public",
        ),
    )
    client.postgrest.auth(access_token)
    return client
