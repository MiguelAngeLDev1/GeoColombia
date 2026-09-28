from fastapi import APIRouter, Query

from app.schemas.earthquake import (
    EarthquakeListResponse,
    LatestEarthquakeResponse,
    NearbyEarthquakeResponse,
    RecentEarthquakeListResponse,
)
from app.services.earthquake_service import EarthquakeService


router = APIRouter(
    prefix="/api/v1/earthquakes",
    tags=["Earthquakes"],
)

earthquake_service = EarthquakeService()


@router.get(
    "",
    response_model=EarthquakeListResponse,
)
async def get_earthquakes(
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Cantidad máxima de sismos a retornar",
    ),
):
    return await earthquake_service.get_catalog(
        limit=limit,
    )


@router.get(
    "/nearby",
    response_model=NearbyEarthquakeResponse,
)
async def get_nearby_earthquakes(
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
    radius_km: float = Query(
        default=50,
        gt=0,
        le=500,
        description="Radio de búsqueda en kilómetros",
    ),
):
    return await earthquake_service.get_nearby_earthquakes(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )

@router.get(
    "/recent",
    response_model=RecentEarthquakeListResponse,
)
async def get_recent_earthquakes(
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Número máximo de sismos recientes a retornar",
    ),
):
    """
    Obtiene los sismos recientes publicados por el
    Servicio Geológico Colombiano.
    """

    return await earthquake_service.get_recent_earthquakes(
        limit=limit,
    )

@router.get(
    "/latest",
    response_model=LatestEarthquakeResponse,
)
async def get_latest_earthquake():
    """
    Obtiene el sismo más reciente publicado por el
    Servicio Geológico Colombiano.
    """

    return await earthquake_service.get_latest_earthquake()