import pytest

from app.core.settings import Settings, parse_cors_origins


def test_parse_cors_origins_splits_and_trims():
    assert parse_cors_origins(
        " https://a.example ,http://localhost:5173 ,"
    ) == [
        "https://a.example",
        "http://localhost:5173",
    ]


def test_development_defaults_localhost_origins(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    monkeypatch.delenv("API_DOCS_ENABLED", raising=False)

    settings = Settings.from_env()
    origins = settings.cors_allowed_origins()
    assert "http://localhost:5173" in origins
    assert "http://127.0.0.1:5173" in origins
    assert settings.api_docs_enabled is True


def test_production_rejects_wildcard(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*")
    with pytest.raises(ValueError, match="\\*"):
        Settings.from_env()


def test_production_empty_cors_means_no_origins(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "")
    monkeypatch.delenv("API_DOCS_ENABLED", raising=False)

    settings = Settings.from_env()
    assert settings.cors_allowed_origins() == []
    assert settings.api_docs_enabled is False


def test_production_explicit_origins(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS",
        "https://app.example.com,https://www.example.com",
    )
    monkeypatch.setenv("API_DOCS_ENABLED", "false")

    settings = Settings.from_env()
    assert settings.cors_allowed_origins() == [
        "https://app.example.com",
        "https://www.example.com",
    ]


def test_invalid_app_env(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    with pytest.raises(ValueError, match="APP_ENV"):
        Settings.from_env()
