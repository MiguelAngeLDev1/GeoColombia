"""Configuración central de la API GeoColombia (variables de entorno)."""

from __future__ import annotations

from dataclasses import dataclass
import os


def _env_str(name: str, default: str) -> str:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip()


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    raise ValueError(
        f"Variable {name} inválida: '{raw}'. Use true/false."
    )


def parse_cors_origins(raw: str) -> list[str]:
    """Lista de orígenes separados por coma (sin espacios extremos)."""
    if not raw or not raw.strip():
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


DEFAULT_DEVELOPMENT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173"
)


@dataclass(frozen=True)
class Settings:
    app_env: str = "development"
    log_level: str = "INFO"
    cors_allowed_origins_raw: str = ""
    api_docs_enabled: bool = True

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env.strip().lower() == "development"

    def cors_allowed_origins(self) -> list[str]:
        """
        Orígenes CORS explícitos.

        - development sin variable: localhost Vite.
        - production sin variable: lista vacía (ningún origen cross-origin).
        - production nunca acepta '*'.
        """
        raw = self.cors_allowed_origins_raw.strip()
        if not raw and self.is_development:
            origins = parse_cors_origins(DEFAULT_DEVELOPMENT_CORS_ORIGINS)
        else:
            origins = parse_cors_origins(raw)

        if self.is_production and "*" in origins:
            raise ValueError(
                "CORS_ALLOWED_ORIGINS no puede incluir '*' en production."
            )

        return origins

    @classmethod
    def from_env(cls) -> "Settings":
        app_env = _env_str("APP_ENV", "development").lower()
        if app_env not in {"development", "production", "test"}:
            raise ValueError(
                "APP_ENV debe ser development, production o test."
            )

        log_level = _env_str("LOG_LEVEL", "INFO").upper()
        allowed_levels = {
            "CRITICAL",
            "ERROR",
            "WARNING",
            "INFO",
            "DEBUG",
            "NOTSET",
        }
        if log_level not in allowed_levels:
            raise ValueError(
                f"LOG_LEVEL inválido: '{log_level}'."
            )

        # En production, docs deshabilitadas por defecto.
        docs_default = app_env != "production"
        api_docs_enabled = _env_bool("API_DOCS_ENABLED", docs_default)

        settings = cls(
            app_env=app_env,
            log_level=log_level,
            cors_allowed_origins_raw=os.getenv("CORS_ALLOWED_ORIGINS", "") or "",
            api_docs_enabled=api_docs_enabled,
        )
        # Validar regla production + '*' al construir.
        _ = settings.cors_allowed_origins()
        return settings


def get_settings() -> Settings:
    """Carga settings desde el entorno actual."""
    return Settings.from_env()
