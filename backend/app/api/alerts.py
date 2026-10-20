from typing import Any

from fastapi import APIRouter, Query

from app.schemas.alerts import (
    FireAlertsResponse,
    HydrologicalAlertsResponse,
    LandslideAlertsResponse,
)
from app.services.alert_layer_service import AlertLayerService
from app.services.alert_service import AlertService


router = APIRouter(
    prefix="/api/v1/alerts",
    tags=["Alerts"],
)

alert_service = AlertService()
alert_layer_service = AlertLayerService()


@router.get(
    "/hydrological",
    response_model=HydrologicalAlertsResponse,
)
async def get_hydrological_alerts(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
        description="Latitud del punto de consulta",
    ),
    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
        description="Longitud del punto de consulta",
    ),
):
    return await alert_service.get_hydrological_alerts(
        latitude=latitude,
        longitude=longitude,
    )


@router.get(
    "/landslides",
    response_model=LandslideAlertsResponse,
)
async def get_landslide_alerts(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
        description="Latitud del punto de consulta",
    ),
    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
        description="Longitud del punto de consulta",
    ),
):
    return await alert_service.get_landslide_alerts(
        latitude=latitude,
        longitude=longitude,
    )


@router.get(
    "/fires",
    response_model=FireAlertsResponse,
)
async def get_fire_alerts(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
        description="Latitud del punto de consulta",
    ),
    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
        description="Longitud del punto de consulta",
    ),
):
    return await alert_service.get_fire_alerts(
        latitude=latitude,
        longitude=longitude,
    )


@router.get(
    "/layers/{layer_type}/national",
    response_model=None,
    summary="Capa GeoJSON IDEAM nacional simplificada",
)
async def get_alert_layer_national_geojson(
    layer_type: str,
    min_level: int = Query(
        1,
        ge=1,
        le=3,
        description=(
            "Nivel mínimo inclusive (ALERTA o PROBABILID)"
        ),
    ),
) -> dict[str, Any]:
    """
    Vista nacional con polígonos simplificados (maxAllowableOffset).

    Capas: hydrological | landslides | fires.
    No sustituye al endpoint regional por bbox.
    La caché es en memoria y por instancia de proceso.
    """

    return await alert_layer_service.get_national_layer_geojson(
        layer_type=layer_type,
        min_level=min_level,
    )


@router.get(
    "/layers/{layer_type}",
    response_model=None,
    summary="Capa GeoJSON IDEAM por bbox",
)
async def get_alert_layer_geojson(
    layer_type: str,
    bbox: str = Query(
        ...,
        description=(
            "Ventana WGS84: min_lon,min_lat,max_lon,max_lat "
            "(ejemplo: -75.40,4.30,-75.05,4.55)"
        ),
    ),
    min_level: int = Query(
        1,
        ge=1,
        le=3,
        description=(
            "Nivel mínimo inclusive (ALERTA o PROBABILID)"
        ),
    ),
) -> dict[str, Any]:
    """
    Devuelve polígonos oficiales IDEAM en GeoJSON para el bbox.

    Capas: hydrological | landslides | fires.
    La caché es en memoria y por instancia de proceso.
    """

    return await alert_layer_service.get_layer_geojson(
        layer_type=layer_type,
        bbox=bbox,
        min_level=min_level,
    )
