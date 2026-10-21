from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import create_app


def _client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))


def test_allowed_origin_receives_cors_header():
    settings = Settings(
        app_env="development",
        log_level="WARNING",
        cors_allowed_origins_raw="http://localhost:5173",
        api_docs_enabled=True,
    )
    client = _client(settings)

    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin")
        == "http://localhost:5173"
    )


def test_disallowed_origin_has_no_allow_origin_header():
    settings = Settings(
        app_env="production",
        log_level="WARNING",
        cors_allowed_origins_raw="https://allowed.example",
        api_docs_enabled=False,
    )
    client = _client(settings)

    response = client.get(
        "/health",
        headers={"Origin": "https://evil.example"},
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" not in {
        k.lower(): v for k, v in response.headers.items()
    }


def test_preflight_options_allowed_origin():
    settings = Settings(
        app_env="development",
        log_level="WARNING",
        cors_allowed_origins_raw="http://127.0.0.1:5173",
        api_docs_enabled=True,
    )
    client = _client(settings)

    response = client.options(
        "/api/v1/earthquakes/recent",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code in {200, 204}
    assert (
        response.headers.get("access-control-allow-origin")
        == "http://127.0.0.1:5173"
    )
    allow_methods = response.headers.get("access-control-allow-methods", "")
    assert "GET" in allow_methods.upper()


def test_development_default_origins_allow_vite():
    settings = Settings(
        app_env="development",
        log_level="WARNING",
        cors_allowed_origins_raw="",
        api_docs_enabled=True,
    )
    client = _client(settings)

    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:5173"},
    )
    assert (
        response.headers.get("access-control-allow-origin")
        == "http://localhost:5173"
    )


def test_production_without_origins_blocks_browser_origin():
    settings = Settings(
        app_env="production",
        log_level="WARNING",
        cors_allowed_origins_raw="",
        api_docs_enabled=False,
    )
    client = _client(settings)

    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") is None


def test_docs_disabled_in_production_defaults():
    settings = Settings(
        app_env="production",
        log_level="WARNING",
        cors_allowed_origins_raw="https://app.example.com",
        api_docs_enabled=False,
    )
    client = _client(settings)

    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404
    assert client.get("/health").status_code == 200
