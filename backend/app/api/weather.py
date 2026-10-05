from fastapi import APIRouter, Query

from app.schemas.weather import WeatherResponse
from app.services.weather_service import WeatherService


router = APIRouter(
    prefix="/api/v1/weather",
    tags=["Weather"],
)

weather_service = WeatherService()


@router.get("", response_model=WeatherResponse)
async def get_weather(
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
    forecast_days: int = Query(
        default=7,
        ge=1,
        le=7,
        description="Número de días de pronóstico",
    ),
    hourly_limit: int = Query(
        default=24,
        ge=1,
        le=168,
        description="Número de horas futuras a retornar",
    ),
):
    """
    Obtiene las condiciones meteorológicas actuales
    y el pronóstico para una coordenada.
    """

    return await weather_service.get_weather(
        latitude=latitude,
        longitude=longitude,
        forecast_days=forecast_days,
        hourly_limit=hourly_limit,
    )