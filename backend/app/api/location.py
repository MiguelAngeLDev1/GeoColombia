from fastapi import APIRouter, Query

from app.schemas.location import LocationContextResponse
from app.schemas.territory import TerritoryResponse
from app.services.location_service import LocationService
from app.services.territory_service import TerritoryService


router = APIRouter(
    prefix="/api/v1/location",
    tags=["Location"],
)

location_service = LocationService()
territory_service = TerritoryService()


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


@router.get(
    "/territory",
    response_model=TerritoryResponse,
)
async def get_territory(
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
    """
    Obtiene el departamento y municipio correspondientes
    a una coordenada utilizando el Marco Geoestadístico
    Nacional del DANE.
    """

    return await territory_service.get_territory_at_point(
        latitude=latitude,
        longitude=longitude,
    )