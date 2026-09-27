from fastapi import APIRouter, Query

from app.schemas.location import LocationContextResponse
from app.services.location_service import LocationService


router = APIRouter(
    prefix="/api/v1/location",
    tags=["Location"],
)

location_service = LocationService()


@router.get(
    "/context",
    response_model=LocationContextResponse,
)
async def get_location_context(
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
        description="Radio para consultar actividad sísmica",
    ),
):
    return await location_service.get_location_context(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )