from app.main import app


def test_openapi_has_bearer_security_scheme():
    schema = app.openapi()
    schemes = schema["components"]["securitySchemes"]
    assert "SupabaseBearer" in schemes
    assert schemes["SupabaseBearer"]["type"] == "http"
    assert schemes["SupabaseBearer"]["scheme"] == "bearer"


def test_public_auth_routes_have_no_security_requirement():
    schema = app.openapi()
    for path in (
        "/api/v1/auth/signup",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
    ):
        operation = next(iter(schema["paths"][path].values()))
        assert "security" not in operation or operation["security"] == []


def test_me_route_requires_security():
    operation = schema = app.openapi()["paths"]["/api/v1/auth/me"]["get"]
    assert operation.get("security")
    assert {"SupabaseBearer": []} in operation["security"]
