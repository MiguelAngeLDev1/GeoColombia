import asyncio
from datetime import datetime, timezone

from app.schemas.location import (
    CurrentWeatherContext,
    LocationContextResponse,
    LocationCoordinates,
    MiningContext,
    NextHourWeatherContext,
    RecentSeismicContext,
    SeismicContext,
    TerritoryContext,
    TodayWeatherContext,
    WeatherContext,
)
from app.services.earthquake_service import EarthquakeService
from app.services.mining_service import MiningService
from app.services.territory_service import TerritoryService
from app.services.weather_service import WeatherService


class LocationService:

    def __init__(self):
        self.earthquake_service = EarthquakeService()
        self.mining_service = MiningService()
        self.territory_service = TerritoryService()
        self.weather_service = WeatherService()

    async def get_location_context(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50,
        earthquake_limit: int = 10,
        recent_earthquake_limit: int = 5,
        weather_hour_limit: int = 6,
    ) -> LocationContextResponse:
        """
        Obtiene el contexto de una coordenada consultando
        DANE, ANM, SGC y Open-Meteo concurrentemente.

        Incluye:
        - Contexto territorial.
        - Condiciones meteorológicas.
        - Títulos mineros.
        - Sismicidad histórica cercana.
        - Sismicidad reciente cercana.
        """

        (
            territory_result,
            mining_result,
            seismic_result,
            recent_seismic_result,
            weather_result,
        ) = await asyncio.gather(
            self.territory_service.get_territory_at_point(
                latitude=latitude,
                longitude=longitude,
            ),
            self.mining_service.get_titles_at_point(
                latitude=latitude,
                longitude=longitude,
            ),
            self.earthquake_service.get_nearby_earthquakes(
                latitude=latitude,
                longitude=longitude,
                radius_km=radius_km,
            ),
            self.earthquake_service.get_recent_earthquakes(
                limit=100,
            ),
            self.weather_service.get_weather(
                latitude=latitude,
                longitude=longitude,
                forecast_days=1,
                hourly_limit=weather_hour_limit,
            ),
        )

        # Sismicidad histórica.
        earthquakes = seismic_result.data[:earthquake_limit]

        # Sismicidad reciente dentro del radio solicitado.
        recent_nearby = []

        for earthquake in recent_seismic_result.data:
            if (
                earthquake.latitude is None
                or earthquake.longitude is None
            ):
                continue

            distance_km = (
                self.earthquake_service.calculate_distance_km(
                    latitude,
                    longitude,
                    earthquake.latitude,
                    earthquake.longitude,
                )
            )

            if distance_km <= radius_km:
                earthquake.distance_km = round(
                    distance_km,
                    2,
                )

                recent_nearby.append(
                    (
                        distance_km,
                        earthquake,
                    )
                )

        # Los eventos recientes se muestran del más nuevo
        # al más antiguo.
        recent_nearby.sort(
            key=lambda item: (
                item[1].occurred_at
                if item[1].occurred_at is not None
                else datetime.min.replace(
                    tzinfo=timezone.utc
                )
            ),
            reverse=True,
        )

        # Total de eventos recientes encontrados dentro
        # del radio antes de aplicar el límite de respuesta.
        recent_count = len(recent_nearby)

        recent_earthquakes = [
            earthquake
            for _, earthquake in recent_nearby[
                :recent_earthquake_limit
            ]
        ]

        # Resumen meteorológico del día actual.
        today = (
            weather_result.daily[0]
            if weather_result.daily
            else None
        )

        weather_context = WeatherContext(
            source=weather_result.source,
            timezone=weather_result.timezone,
            current=CurrentWeatherContext(
                observed_at=weather_result.current.observed_at,
                temperature_c=weather_result.current.temperature_c,
                feels_like_c=weather_result.current.feels_like_c,
                condition=weather_result.current.condition,
                humidity_percent=weather_result.current.humidity_percent,
                precipitation_mm=weather_result.current.precipitation_mm,
                is_raining=weather_result.current.is_raining,
                wind_speed_kmh=weather_result.current.wind_speed_kmh,
            ),
            today=(
                TodayWeatherContext(
                    temperature_min_c=today.temperature_min_c,
                    temperature_max_c=today.temperature_max_c,
                    precipitation_probability_max_percent=(
                        today.precipitation_probability_max_percent
                    ),
                    precipitation_sum_mm=today.precipitation_sum_mm,
                    uv_index_max=today.uv_index_max,
                )
                if today is not None
                else None
            ),
            next_hours=[
                NextHourWeatherContext(
                    time=hour.time,
                    temperature_c=hour.temperature_c,
                    condition=hour.condition,
                    precipitation_probability_percent=(
                        hour.precipitation_probability_percent
                    ),
                    rain_mm=hour.rain_mm,
                )
                for hour in weather_result.hourly
            ],
        )

        return LocationContextResponse(
            location=LocationCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            territory=TerritoryContext(
                department=territory_result.department,
                municipality=territory_result.municipality,
                reference_year=territory_result.reference_year,
            ),
            weather=weather_context,
            mining=MiningContext(
                has_titles=mining_result.count > 0,
                count=mining_result.count,
                titles=mining_result.data,
            ),
            seismic=SeismicContext(
                radius_km=seismic_result.radius_km,
                count=seismic_result.count,
                returned=len(earthquakes),
                earthquakes=earthquakes,
                recent=RecentSeismicContext(
                    count=recent_count,
                    returned=len(recent_earthquakes),
                    earthquakes=recent_earthquakes,
                ),
            ),
        )