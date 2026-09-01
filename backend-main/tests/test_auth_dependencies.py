import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.dependencies import bearer_token


def test_bearer_token_requires_credentials():
    with pytest.raises(HTTPException) as exc:
        bearer_token(None)
    assert exc.value.status_code == 401
    assert exc.value.headers["WWW-Authenticate"] == "Bearer"


def test_bearer_token_extracts_token():
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="eyJ-test-token",
    )
    assert bearer_token(credentials) == "eyJ-test-token"


def test_bearer_token_rejects_non_bearer_scheme():
    credentials = HTTPAuthorizationCredentials(
        scheme="Basic",
        credentials="abc",
    )
    with pytest.raises(HTTPException) as exc:
        bearer_token(credentials)
    assert exc.value.status_code == 401
