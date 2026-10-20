from __future__ import annotations

import json
import math
from collections.abc import Awaitable, Callable
from typing import Any, Literal

from app.core.alert_layer_config import (
    DEFAULT_ALERT_LAYER_CONFIG,
    AlertLayerConfig,
)
from app.core.exceptions import AlertLayerError, ExternalServiceError
from app.integrations.ideam.client import (
    IDEAM_FIRE_ALERTS_URL,
    IDEAM_HYDROLOGICAL_ALERTS_URL,
    IDEAM_HYDROLOGICAL_LAYER_FIELDS,
    IDEAM_LANDSLIDE_ALERTS_URL,
    IDEAM_MUNICIPAL_LAYER_FIELDS,
    IDEAMClient,
)
from app.services.alert_layer_cache import AlertLayerCache
from app.services.alert_service import (
    HYDROLOGICAL_ALERT_LEVELS,
    MUNICIPAL_THREAT_LEVEL_LABELS,
    MUNICIPAL_THREAT_LEVELS,
)

PageFetcher = Callable[[int, int], Awaitable[dict[str, Any]]]


AlertLayerType = Literal["hydrological", "landslides", "fires"]

LAYER_URLS: dict[AlertLayerType, str] = {
    "hydrological": IDEAM_HYDROLOGICAL_ALERTS_URL,
    "landslides": IDEAM_LANDSLIDE_ALERTS_URL,
    "fires": IDEAM_FIRE_ALERTS_URL,
}

LAYER_FIELDS: dict[AlertLayerType, str] = {
    "hydrological": IDEAM_HYDROLOGICAL_LAYER_FIELDS,
    "landslides": IDEAM_MUNICIPAL_LAYER_FIELDS,
    "fires": IDEAM_MUNICIPAL_LAYER_FIELDS,
}

HYDRO_LEVEL_LABELS = {
    1: "ALERTA AMARILLA",
    2: "ALERTA NARANJA",
    3: "ALERTA ROJA",
}

# Extensión aproximada de Colombia (+ margen) para rechazar bbox absurdos.
COLOMBIA_BBOX_BOUNDS = {
    "min_lon": -85.0,
    "min_lat": -6.0,
    "max_lon": -65.0,
    "max_lat": 16.0,
}


class AlertLayerService:
    def __init__(
        self,
        *,
        ideam_client: IDEAMClient | None = None,
        config: AlertLayerConfig | None = None,
        cache: AlertLayerCache | None = None,
    ):
        self.ideam_client = ideam_client or IDEAMClient()
        self.config = config or DEFAULT_ALERT_LAYER_CONFIG
        self.cache = cache or AlertLayerCache(
            ttl_seconds=self.config.cache_ttl_seconds,
            max_entries=self.config.cache_max_entries,
        )

    async def get_layer_geojson(
        self,
        *,
        layer_type: str,
        bbox: str,
        min_level: int = 1,
    ) -> dict[str, Any]:
        normalized_layer = self._parse_layer_type(layer_type)
        min_level_value = self._parse_min_level(min_level)
        parsed_bbox = self._parse_bbox(bbox)
        self._validate_bbox_limits(parsed_bbox)

        cache_key = self._cache_key(
            normalized_layer,
            parsed_bbox,
            min_level_value,
        )
        cached = self.cache.get(cache_key)
        if cached is not None:
            response = dict(cached)
            response["cached"] = True
            return response

        features = await self._fetch_all_features(
            layer_type=normalized_layer,
            bbox=parsed_bbox,
            min_level=min_level_value,
        )

        collection = {
            "type": "FeatureCollection",
            "features": features,
            "source": "IDEAM",
            "layer_type": normalized_layer,
            "bbox": list(parsed_bbox),
            "min_level": min_level_value,
            "count": len(features),
            "cached": False,
        }

        payload_bytes = self._encoded_size(collection)
        if payload_bytes > self.config.max_response_bytes:
            raise AlertLayerError(
                (
                    "La respuesta GeoJSON supera el tamaño máximo "
                    f"permitido ({self.config.max_response_bytes} bytes). "
                    "Acerque el mapa o reduzca el área de consulta."
                ),
                code="response_too_large",
                status_code=413,
            )

        self.cache.set(
            cache_key,
            collection,
            size_bytes=payload_bytes,
        )
        return collection

    async def get_national_layer_geojson(
        self,
        *,
        layer_type: str,
        min_level: int = 1,
    ) -> dict[str, Any]:
        """Vista nacional simplificada vía maxAllowableOffset (grados WGS84)."""

        normalized_layer = self._parse_layer_type(layer_type)
        min_level_value = self._parse_min_level(min_level)
        offset = self.config.national_offset_for(normalized_layer)

        cache_key = self._national_cache_key(
            normalized_layer,
            offset=offset,
            min_level=min_level_value,
        )
        cached = self.cache.get(cache_key)
        if cached is not None:
            response = dict(cached)
            response["cached"] = True
            return response

        features = await self._fetch_national_features(
            layer_type=normalized_layer,
            min_level=min_level_value,
            max_allowable_offset=offset,
        )

        collection = {
            "type": "FeatureCollection",
            "features": features,
            "source": "IDEAM",
            "layer_type": normalized_layer,
            "mode": "national",
            "min_level": min_level_value,
            "max_allowable_offset": offset,
            "max_allowable_offset_unit": "degrees_wgs84",
            "count": len(features),
            "cached": False,
        }

        payload_bytes = self._encoded_size(collection)
        if payload_bytes > self.config.national_max_response_bytes:
            raise AlertLayerError(
                (
                    "La respuesta nacional GeoJSON supera el tamaño máximo "
                    f"permitido ({self.config.national_max_response_bytes} "
                    "bytes)."
                ),
                code="response_too_large",
                status_code=413,
            )

        self.cache.set(
            cache_key,
            collection,
            size_bytes=payload_bytes,
            ttl_seconds=self.config.national_cache_ttl_seconds,
        )
        return collection

    async def _fetch_all_features(
        self,
        *,
        layer_type: AlertLayerType,
        bbox: tuple[float, float, float, float],
        min_level: int,
    ) -> list[dict[str, Any]]:
        where = self._build_where(layer_type, min_level)
        out_fields = LAYER_FIELDS[layer_type]
        url = LAYER_URLS[layer_type]
        min_lon, min_lat, max_lon, max_lat = bbox

        async def fetch_page(
            offset: int,
            page_size: int,
        ) -> dict[str, Any]:
            return await self.ideam_client.query_layer_geojson(
                url=url,
                min_lon=min_lon,
                min_lat=min_lat,
                max_lon=max_lon,
                max_lat=max_lat,
                where=where,
                out_fields=out_fields,
                result_offset=offset,
                result_record_count=page_size,
                timeout_seconds=self.config.request_timeout_seconds,
            )

        return await self._collect_paginated_features(
            layer_type=layer_type,
            fetch_page=fetch_page,
            max_features=self.config.max_features,
            max_response_bytes=self.config.max_response_bytes,
            page_size=self.config.page_size,
            feature_limit_message=(
                "La ventana consultada contiene demasiadas "
                f"entidades (máximo {self.config.max_features}). "
                "Acerque el mapa para reducir el área."
            ),
            response_too_large_message=(
                "La respuesta GeoJSON supera el tamaño máximo "
                f"permitido ({self.config.max_response_bytes} "
                "bytes). Acerque el mapa o reduzca el área "
                "de consulta."
            ),
            truncated_message=(
                "IDEAM indicó una respuesta truncada. "
                "Acerque el mapa e intente de nuevo."
            ),
            stuck_message=(
                "IDEAM devolvió páginas repetidas sin avance. "
                "Acerque el mapa e intente de nuevo."
            ),
            max_pages_message=(
                "La paginación de IDEAM no terminó de forma "
                "segura. Acerque el mapa e intente de nuevo."
            ),
        )

    async def _fetch_national_features(
        self,
        *,
        layer_type: AlertLayerType,
        min_level: int,
        max_allowable_offset: float,
    ) -> list[dict[str, Any]]:
        where = self._build_where(layer_type, min_level)
        out_fields = LAYER_FIELDS[layer_type]
        url = LAYER_URLS[layer_type]

        async def fetch_page(
            offset: int,
            page_size: int,
        ) -> dict[str, Any]:
            return await self.ideam_client.query_national_layer_geojson(
                url=url,
                where=where,
                out_fields=out_fields,
                max_allowable_offset=max_allowable_offset,
                result_offset=offset,
                result_record_count=page_size,
                timeout_seconds=(
                    self.config.national_request_timeout_seconds
                ),
            )

        return await self._collect_paginated_features(
            layer_type=layer_type,
            fetch_page=fetch_page,
            max_features=self.config.national_max_features,
            max_response_bytes=self.config.national_max_response_bytes,
            page_size=self.config.national_page_size,
            feature_limit_message=(
                "La capa nacional contiene demasiadas entidades "
                f"(máximo {self.config.national_max_features}). "
                "No se truncó la respuesta."
            ),
            response_too_large_message=(
                "La respuesta nacional GeoJSON supera el tamaño máximo "
                f"permitido ({self.config.national_max_response_bytes} "
                "bytes)."
            ),
            truncated_message=(
                "IDEAM indicó una respuesta nacional truncada. "
                "Intente de nuevo más tarde."
            ),
            stuck_message=(
                "IDEAM devolvió páginas nacionales repetidas sin avance."
            ),
            max_pages_message=(
                "La paginación nacional de IDEAM no terminó de forma segura."
            ),
        )

    async def _collect_paginated_features(
        self,
        *,
        layer_type: AlertLayerType,
        fetch_page: PageFetcher,
        max_features: int,
        max_response_bytes: int,
        page_size: int,
        feature_limit_message: str,
        response_too_large_message: str,
        truncated_message: str,
        stuck_message: str,
        max_pages_message: str,
    ) -> list[dict[str, Any]]:
        collected: list[dict[str, Any]] = []
        seen_ids: set[int] = set()
        offset = 0
        accumulated_bytes = 0
        # Cota dura de páginas: evita bucles si IDEAM repite offsets.
        max_pages = (max_features // max(page_size, 1)) + 2
        page_index = 0

        while True:
            page_index += 1
            if page_index > max_pages:
                raise AlertLayerError(
                    max_pages_message,
                    code="response_truncated",
                    status_code=502,
                )

            raw = await fetch_page(offset, page_size)

            page_features = raw.get("features")
            if page_features is None:
                raise ExternalServiceError(
                    service="IDEAM",
                    message=(
                        "IDEAM devolvió un GeoJSON sin lista de features."
                    ),
                )
            if not isinstance(page_features, list):
                raise ExternalServiceError(
                    service="IDEAM",
                    message=(
                        "IDEAM devolvió un GeoJSON con features inválidas."
                    ),
                )

            added_this_page = 0
            for feature in page_features:
                normalized = self._normalize_feature(
                    feature,
                    layer_type=layer_type,
                )
                if normalized is None:
                    continue

                object_id = normalized["properties"]["object_id"]
                if object_id in seen_ids:
                    continue

                if len(collected) >= max_features:
                    raise AlertLayerError(
                        feature_limit_message,
                        code="feature_limit_exceeded",
                        status_code=413,
                    )

                feature_bytes = self._encoded_size(normalized)
                if accumulated_bytes + feature_bytes > max_response_bytes:
                    raise AlertLayerError(
                        response_too_large_message,
                        code="response_too_large",
                        status_code=413,
                    )

                seen_ids.add(object_id)
                collected.append(normalized)
                accumulated_bytes += feature_bytes
                added_this_page += 1

            exceeded_flag = raw.get("exceededTransferLimit")
            page_count = len(page_features)

            if page_count == 0:
                break

            if page_count < page_size:
                if exceeded_flag is True:
                    raise AlertLayerError(
                        truncated_message,
                        code="response_truncated",
                        status_code=502,
                    )
                break

            # Página completa sin features nuevas: paginación atascada.
            if added_this_page == 0:
                raise AlertLayerError(
                    stuck_message,
                    code="response_truncated",
                    status_code=502,
                )

            # Página completa: avanzar offset.
            offset += page_count
            if exceeded_flag is False:
                break

        return collected

    def _normalize_feature(
        self,
        feature: Any,
        *,
        layer_type: AlertLayerType,
    ) -> dict[str, Any] | None:
        if not isinstance(feature, dict):
            raise ExternalServiceError(
                service="IDEAM",
                message="IDEAM devolvió una feature GeoJSON inválida.",
            )

        geometry = feature.get("geometry")
        properties = feature.get("properties")
        if properties is None and isinstance(feature.get("attributes"), dict):
            properties = feature.get("attributes")

        if not isinstance(properties, dict):
            raise ExternalServiceError(
                service="IDEAM",
                message=(
                    "IDEAM devolvió una feature sin propiedades válidas."
                ),
            )

        if geometry is None:
            return None

        validated_geometry = self._validate_geometry(geometry)
        object_id = self._require_object_id(properties)
        level, level_key, level_label = self._extract_level(
            properties,
            layer_type=layer_type,
        )
        # No devolver amenaza nula / nivel 0 aunque el where falle.
        if level < 1:
            return None
        name = self._feature_name(properties, layer_type=layer_type)

        normalized_properties: dict[str, Any] = {
            "object_id": object_id,
            "layer_type": layer_type,
            "level": level,
            "level_key": level_key,
            "level_label": level_label,
            "name": name,
            "source": "IDEAM",
        }

        if layer_type == "hydrological":
            normalized_properties.update(
                {
                    "department": self._clean_string(properties.get("DEP")),
                    "hydrographic_area_code": properties.get("AH"),
                    "hydrographic_area": self._clean_string(
                        properties.get("NOMAH")
                    ),
                    "hydrographic_zone_code": properties.get("ZH"),
                    "hydrographic_zone": self._clean_string(
                        properties.get("NOMZH")
                    ),
                    "hydrographic_subzone_code": properties.get("SZH"),
                    "hydrographic_subzone": self._clean_string(
                        properties.get("NOMSZH")
                    ),
                }
            )
        else:
            municipality_code = self._municipality_code(properties)
            normalized_properties.update(
                {
                    "department": self._department_name(properties),
                    "municipality": self._municipality_name(properties),
                    "municipality_code": municipality_code,
                    "department_code": self._department_code(properties),
                    "region": self._clean_string(properties.get("REGION")),
                }
            )

        return {
            "type": "Feature",
            "id": f"{layer_type}-{object_id}",
            "geometry": validated_geometry,
            "properties": normalized_properties,
        }

    def _validate_geometry(self, geometry: Any) -> dict[str, Any]:
        if not isinstance(geometry, dict):
            raise ExternalServiceError(
                service="IDEAM",
                message="IDEAM devolvió una geometría inválida.",
            )

        geometry_type = geometry.get("type")
        coordinates = geometry.get("coordinates")

        if geometry_type not in {"Polygon", "MultiPolygon"}:
            raise ExternalServiceError(
                service="IDEAM",
                message=(
                    "IDEAM devolvió una geometría no soportada "
                    f"({geometry_type})."
                ),
            )

        if not self._coordinates_are_valid(coordinates):
            raise ExternalServiceError(
                service="IDEAM",
                message=(
                    "IDEAM devolvió coordenadas inválidas en la geometría."
                ),
            )

        return {
            "type": geometry_type,
            "coordinates": coordinates,
        }

    def _coordinates_are_valid(self, node: Any) -> bool:
        if isinstance(node, (int, float)):
            return math.isfinite(float(node))

        if not isinstance(node, list) or not node:
            return False

        # Posición [lon, lat, ...]
        if all(isinstance(item, (int, float)) for item in node):
            if len(node) < 2:
                return False
            lon = float(node[0])
            lat = float(node[1])
            if not (math.isfinite(lon) and math.isfinite(lat)):
                return False
            if lon < -180 or lon > 180 or lat < -90 or lat > 90:
                return False
            return True

        return all(self._coordinates_are_valid(item) for item in node)

    def _extract_level(
        self,
        properties: dict[str, Any],
        *,
        layer_type: AlertLayerType,
    ) -> tuple[int, str, str]:
        if layer_type == "hydrological":
            raw = properties.get("ALERTA")
            level = self._as_int(raw)
            if level is None:
                raise ExternalServiceError(
                    service="IDEAM",
                    message="Feature hidrológica sin campo ALERTA válido.",
                )
            level_key = HYDROLOGICAL_ALERT_LEVELS.get(level, "unknown")
            label = self._clean_string(properties.get("NIVEL_A"))
            if not label:
                label = HYDRO_LEVEL_LABELS.get(
                    level,
                    "ALERTA NO RECONOCIDA",
                )
            return level, level_key, label

        raw = properties.get("PROBABILID")
        level = self._as_int(raw)
        if level is None:
            raise ExternalServiceError(
                service="IDEAM",
                message="Feature municipal sin campo PROBABILID válido.",
            )
        level_key = MUNICIPAL_THREAT_LEVELS.get(level, "unknown")
        label = MUNICIPAL_THREAT_LEVEL_LABELS.get(
            level,
            "AMENAZA NO RECONOCIDA",
        )
        return level, level_key, label

    def _feature_name(
        self,
        properties: dict[str, Any],
        *,
        layer_type: AlertLayerType,
    ) -> str | None:
        if layer_type == "hydrological":
            return (
                self._clean_string(properties.get("NOMSZH"))
                or self._clean_string(properties.get("NOMZH"))
                or self._clean_string(properties.get("NOMAH"))
            )

        return self._municipality_name(properties)

    def _department_name(self, properties: dict[str, Any]) -> str | None:
        return self._clean_string(
            properties.get("DPTO_CNMBR")
        ) or self._clean_string(properties.get("DEPARTAMEN"))

    def _municipality_name(self, properties: dict[str, Any]) -> str | None:
        return self._clean_string(
            properties.get("MPIO_CNMBR")
        ) or self._clean_string(properties.get("MUNICIPIO"))

    def _department_code(self, properties: dict[str, Any]) -> str | None:
        value = properties.get("DPTO_CCDGO")
        if value is None:
            return None
        as_int = self._as_int(value)
        if as_int is None:
            text = self._clean_string(value)
            return text
        return str(as_int).zfill(2)

    def _municipality_code(self, properties: dict[str, Any]) -> str | None:
        value = properties.get("MPIO_CDPMP")
        if value is None:
            value = properties.get("COD_DANE")
        if value is None:
            return None

        as_int = self._as_int(value)
        if as_int is None:
            text = self._clean_string(value)
            if text and text.isdigit():
                return text.zfill(5)
            return text
        if as_int == 0:
            return None
        return str(as_int).zfill(5)

    def _require_object_id(self, properties: dict[str, Any]) -> int:
        object_id = self._as_int(properties.get("OBJECTID"))
        if object_id is None:
            raise ExternalServiceError(
                service="IDEAM",
                message="Feature IDEAM sin OBJECTID estable.",
            )
        return object_id

    def _build_where(
        self,
        layer_type: AlertLayerType,
        min_level: int,
    ) -> str:
        if layer_type == "hydrological":
            return f"ALERTA>={min_level}"
        return f"PROBABILID>={min_level}"

    def _parse_layer_type(self, layer_type: str) -> AlertLayerType:
        if layer_type not in LAYER_URLS:
            raise AlertLayerError(
                (
                    "Capa desconocida. Use hydrological, landslides o fires."
                ),
                code="unknown_layer",
                status_code=404,
            )
        return layer_type  # type: ignore[return-value]

    def _parse_min_level(self, min_level: int) -> int:
        if min_level not in {1, 2, 3}:
            raise AlertLayerError(
                "min_level debe ser 1, 2 o 3.",
                code="invalid_min_level",
                status_code=422,
            )
        return min_level

    def _parse_bbox(
        self,
        bbox: str,
    ) -> tuple[float, float, float, float]:
        parts = [part.strip() for part in bbox.split(",")]
        if len(parts) != 4:
            raise AlertLayerError(
                (
                    "bbox inválido. Use min_lon,min_lat,max_lon,max_lat "
                    "en WGS84."
                ),
                code="invalid_bbox",
                status_code=422,
            )

        try:
            min_lon, min_lat, max_lon, max_lat = (
                float(parts[0]),
                float(parts[1]),
                float(parts[2]),
                float(parts[3]),
            )
        except ValueError as exc:
            raise AlertLayerError(
                "bbox inválido: las coordenadas deben ser numéricas.",
                code="invalid_bbox",
                status_code=422,
            ) from exc

        values = (min_lon, min_lat, max_lon, max_lat)
        if any(not math.isfinite(value) for value in values):
            raise AlertLayerError(
                "bbox inválido: coordenadas no finitas.",
                code="invalid_bbox",
                status_code=422,
            )

        if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
            raise AlertLayerError(
                "bbox inválido: longitud fuera de rango.",
                code="invalid_bbox",
                status_code=422,
            )
        if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
            raise AlertLayerError(
                "bbox inválido: latitud fuera de rango.",
                code="invalid_bbox",
                status_code=422,
            )
        if min_lon >= max_lon or min_lat >= max_lat:
            raise AlertLayerError(
                (
                    "bbox inválido: min_lon < max_lon y "
                    "min_lat < max_lat son obligatorios."
                ),
                code="invalid_bbox",
                status_code=422,
            )

        return (min_lon, min_lat, max_lon, max_lat)

    def _validate_bbox_limits(
        self,
        bbox: tuple[float, float, float, float],
    ) -> None:
        min_lon, min_lat, max_lon, max_lat = bbox
        span_lon = max_lon - min_lon
        span_lat = max_lat - min_lat

        if (
            span_lon > self.config.max_bbox_span_deg
            or span_lat > self.config.max_bbox_span_deg
        ):
            raise AlertLayerError(
                (
                    "El área solicitada es demasiado grande "
                    f"(máximo {self.config.max_bbox_span_deg}° "
                    "por lado). Acerque el mapa."
                ),
                code="bbox_too_large",
                status_code=413,
            )

        bounds = COLOMBIA_BBOX_BOUNDS
        if (
            max_lon < bounds["min_lon"]
            or min_lon > bounds["max_lon"]
            or max_lat < bounds["min_lat"]
            or min_lat > bounds["max_lat"]
        ):
            raise AlertLayerError(
                (
                    "El bbox está fuera de la cobertura esperada "
                    "para Colombia."
                ),
                code="bbox_out_of_coverage",
                status_code=422,
            )

    def _cache_key(
        self,
        layer_type: AlertLayerType,
        bbox: tuple[float, float, float, float],
        min_level: int,
    ) -> str:
        # Clave exacta de la ventana solicitada.
        # No redondear de forma gruesa (p. ej. 4 decimales): eso puede
        # fusionar bboxes distintos y devolver polígonos incorrectos.
        min_lon, min_lat, max_lon, max_lat = bbox
        return (
            f"regional|{layer_type}|"
            f"{min_lon:.8f},{min_lat:.8f},"
            f"{max_lon:.8f},{max_lat:.8f}|"
            f"{min_level}"
        )

    def _national_cache_key(
        self,
        layer_type: AlertLayerType,
        *,
        offset: float,
        min_level: int,
    ) -> str:
        return (
            f"national|{layer_type}|"
            f"offset={offset:.8f}|"
            f"{min_level}"
        )

    @staticmethod
    def _encoded_size(payload: dict[str, Any]) -> int:
        return len(
            json.dumps(
                payload,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8")
        )

    @staticmethod
    def _as_int(value: Any) -> int | None:
        if value is None or isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            if not math.isfinite(value) or value != int(value):
                return None
            return int(value)
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            try:
                number = float(text)
            except ValueError:
                return None
            if not math.isfinite(number) or number != int(number):
                return None
            return int(number)
        return None

    @staticmethod
    def _clean_string(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None
