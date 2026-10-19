"""Límites configurables para capas GeoJSON IDEAM (por instancia)."""

from dataclasses import dataclass
import os


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return float(raw)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


@dataclass(frozen=True)
class AlertLayerConfig:
    # Extensión máxima del bbox en grados (lon y lat por separado).
    max_bbox_span_deg: float = 1.5
    # Límite de entidades en la FeatureCollection final.
    max_features: int = 250
    # Tamaño máximo de la respuesta serializada (bytes).
    max_response_bytes: int = 5_000_000
    # Timeout HTTP hacia IDEAM para consultas con geometría.
    request_timeout_seconds: float = 25.0
    # Paginación ArcGIS.
    page_size: int = 50
    # Caché en memoria (por proceso / instancia).
    cache_ttl_seconds: int = 600
    cache_max_entries: int = 64

    @classmethod
    def from_env(cls) -> "AlertLayerConfig":
        return cls(
            max_bbox_span_deg=_env_float(
                "ALERT_LAYER_MAX_BBOX_SPAN_DEG",
                1.5,
            ),
            max_features=_env_int(
                "ALERT_LAYER_MAX_FEATURES",
                250,
            ),
            max_response_bytes=_env_int(
                "ALERT_LAYER_MAX_RESPONSE_BYTES",
                5_000_000,
            ),
            request_timeout_seconds=_env_float(
                "ALERT_LAYER_REQUEST_TIMEOUT_SECONDS",
                25.0,
            ),
            page_size=_env_int(
                "ALERT_LAYER_PAGE_SIZE",
                50,
            ),
            cache_ttl_seconds=_env_int(
                "ALERT_LAYER_CACHE_TTL_SECONDS",
                600,
            ),
            cache_max_entries=_env_int(
                "ALERT_LAYER_CACHE_MAX_ENTRIES",
                64,
            ),
        )


DEFAULT_ALERT_LAYER_CONFIG = AlertLayerConfig.from_env()
