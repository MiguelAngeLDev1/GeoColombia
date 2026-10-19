from fastapi import APIRouter, Query

from app.schemas.alerts import (
    FireAlertsResponse,
    HydrologicalAlertsResponse,
    LandslideAlertsResponse,
)
from app.services.alert_service import AlertService


router = APIRouter(
    prefix="/api/v1/alerts",
    tags=["Alerts"],
)

alert_service = AlertService()


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
