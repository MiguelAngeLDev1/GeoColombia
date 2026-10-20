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


def _env_optional_float(name: str) -> float | None:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return None
    return float(raw)


@dataclass(frozen=True)
class AlertLayerConfig:
    # --- Modo regional (bbox) ---
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

    # --- Modo nacional (simplificado) ---
    # maxAllowableOffset en unidades de outSR (WGS84 → grados).
    # No es una tolerancia métrica uniforme en kilómetros.
    national_max_allowable_offset: float = 0.05
    # Overrides opcionales por capa (None = usar national_max_allowable_offset).
    national_max_allowable_offset_hydrological: float | None = None
    national_max_allowable_offset_landslides: float | None = None
    national_max_allowable_offset_fires: float | None = None
    national_max_features: int = 600
    national_max_response_bytes: int = 5_000_000
    national_request_timeout_seconds: float = 30.0
    national_page_size: int = 200
    national_cache_ttl_seconds: int = 700

    def national_offset_for(self, layer_type: str) -> float:
        overrides = {
            "hydrological": self.national_max_allowable_offset_hydrological,
            "landslides": self.national_max_allowable_offset_landslides,
            "fires": self.national_max_allowable_offset_fires,
        }
        value = overrides.get(layer_type)
        if value is not None:
            return value
        return self.national_max_allowable_offset

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
            national_max_allowable_offset=_env_float(
                "ALERT_LAYER_NATIONAL_MAX_ALLOWABLE_OFFSET",
                0.05,
            ),
            national_max_allowable_offset_hydrological=_env_optional_float(
                "ALERT_LAYER_NATIONAL_MAX_ALLOWABLE_OFFSET_HYDROLOGICAL",
            ),
            national_max_allowable_offset_landslides=_env_optional_float(
                "ALERT_LAYER_NATIONAL_MAX_ALLOWABLE_OFFSET_LANDSLIDES",
            ),
            national_max_allowable_offset_fires=_env_optional_float(
                "ALERT_LAYER_NATIONAL_MAX_ALLOWABLE_OFFSET_FIRES",
            ),
            national_max_features=_env_int(
                "ALERT_LAYER_NATIONAL_MAX_FEATURES",
                600,
            ),
            national_max_response_bytes=_env_int(
                "ALERT_LAYER_NATIONAL_MAX_RESPONSE_BYTES",
                5_000_000,
            ),
            national_request_timeout_seconds=_env_float(
                "ALERT_LAYER_NATIONAL_REQUEST_TIMEOUT_SECONDS",
                30.0,
            ),
            national_page_size=_env_int(
                "ALERT_LAYER_NATIONAL_PAGE_SIZE",
                200,
            ),
            national_cache_ttl_seconds=_env_int(
                "ALERT_LAYER_NATIONAL_CACHE_TTL_SECONDS",
                700,
            ),
        )


DEFAULT_ALERT_LAYER_CONFIG = AlertLayerConfig.from_env()
