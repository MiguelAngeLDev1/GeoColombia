import asyncio
import logging
from datetime import datetime, timezone

from app.core.exceptions import ExternalServiceError
from app.schemas.location import (
    AlertsContext,
    CurrentWeatherContext,
    HydrologicalAlertsContext,
    LocationContextResponse,
    LocationCoordinates,
    MiningContext,
    NextHourWeatherContext,
    RecentSeismicContext,
    SeismicContext,
    TerritoryContext,
    TodayWeatherContext,
    UnavailableSource,
    WeatherContext,
)
from app.services.alert_service import AlertService
from app.services.earthquake_service import EarthquakeService
from app.services.mining_service import MiningService
from app.services.territory_service import TerritoryService
from app.services.weather_service import WeatherService


logger = logging.getLogger(__name__)


class LocationService:

    def __init__(self):
        self.earthquake_service = EarthquakeService()
        self.mining_service = MiningService()
        self.territory_service = TerritoryService()
        self.weather_service = WeatherService()
        self.alert_service = AlertService()

    @staticmethod
    def _resolve_provider_result(
        result,
        *,
        service: str,
        component: str,
        unavailable_sources: list[UnavailableSource],
    ):
        """
        Resuelve un resultado de asyncio.gather.

        ExternalServiceError degrada la sección.
        Errores inesperados y cancelaciones se propagan.
        """

        if isinstance(result, ExternalServiceError):
            logger.warning(
                "location_context provider unavailable "
                "service=%s component=%s message=%s",
                service,
                component,
                result.message,
            )

            unavailable_sources.append(
                UnavailableSource(
                    service=service,
                    component=component,
                    message=result.message,
                )
            )

            return None

        if isinstance(result, BaseException):
            raise result

        return result

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
        DANE, ANM, SGC, Open-Meteo e IDEAM concurrentemente.

        Si un proveedor externo falla, el agregador continúa
        con información parcial y reporta la fuente no disponible.
        """

        results = await asyncio.gather(
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
            self.alert_service.get_hydrological_alerts(
                latitude=latitude,
                longitude=longitude,
            ),
            return_exceptions=True,
        )

        unavailable_sources: list[UnavailableSource] = []

        territory_result = self._resolve_provider_result(
            results[0],
            service="DANE",
            component="territory",
            unavailable_sources=unavailable_sources,
        )
        mining_result = self._resolve_provider_result(
            results[1],
            service="ANM",
            component="mining",
            unavailable_sources=unavailable_sources,
        )
        seismic_result = self._resolve_provider_result(
            results[2],
            service="SGC",
            component="nearby_earthquakes",
            unavailable_sources=unavailable_sources,
        )
        recent_seismic_result = self._resolve_provider_result(
            results[3],
            service="SGC",
            component="recent_earthquakes",
            unavailable_sources=unavailable_sources,
        )
        weather_result = self._resolve_provider_result(
            results[4],
            service="Open-Meteo",
            component="weather",
            unavailable_sources=unavailable_sources,
        )
        hydrological_alerts_result = self._resolve_provider_result(
            results[5],
            service="IDEAM",
            component="hydrological_alerts",
            unavailable_sources=unavailable_sources,
        )

        if (
            territory_result is None
            and mining_result is None
            and seismic_result is None
            and recent_seismic_result is None
            and weather_result is None
            and hydrological_alerts_result is None
        ):
            raise ExternalServiceError(
                service="location_context",
                message="All external providers failed",
            )

        territory_context = None

        if territory_result is not None:
            territory_context = TerritoryContext(
                department=territory_result.department,
                municipality=territory_result.municipality,
                reference_year=territory_result.reference_year,
            )

        mining_context = None

        if mining_result is not None:
            mining_context = MiningContext(
                has_titles=mining_result.count > 0,
                count=mining_result.count,
                titles=mining_result.data,
            )

        weather_context = None

        if weather_result is not None:
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
                    humidity_percent=(
                        weather_result.current.humidity_percent
                    ),
                    precipitation_mm=(
                        weather_result.current.precipitation_mm
                    ),
                    is_raining=weather_result.current.is_raining,
                    wind_speed_kmh=(
                        weather_result.current.wind_speed_kmh
                    ),
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

        alerts_context = None

        if hydrological_alerts_result is not None:
            alerts_context = AlertsContext(
                source=hydrological_alerts_result.source,
                hydrological=HydrologicalAlertsContext(
                    has_alerts=(
                        hydrological_alerts_result.has_alerts
                    ),
                    count=hydrological_alerts_result.count,
                    alerts=hydrological_alerts_result.alerts,
                ),
            )

        seismic_context = None

        if (
            seismic_result is not None
            or recent_seismic_result is not None
        ):
            if seismic_result is not None:
                earthquakes = seismic_result.data[
                    :earthquake_limit
                ]
                seismic_count = seismic_result.count
                seismic_radius_km = seismic_result.radius_km
            else:
                earthquakes = []
                seismic_count = 0
                seismic_radius_km = radius_km

            recent_nearby = []

            if recent_seismic_result is not None:
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

            recent_count = len(recent_nearby)

            recent_earthquakes = [
                earthquake
                for _, earthquake in recent_nearby[
                    :recent_earthquake_limit
                ]
            ]

            seismic_context = SeismicContext(
                radius_km=seismic_radius_km,
                count=seismic_count,
                returned=len(earthquakes),
                earthquakes=earthquakes,
                recent=RecentSeismicContext(
                    count=recent_count,
                    returned=len(recent_earthquakes),
                    earthquakes=recent_earthquakes,
                ),
            )

        return LocationContextResponse(
            location=LocationCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            territory=territory_context,
            weather=weather_context,
            alerts=alerts_context,
            mining=mining_context,
            seismic=seismic_context,
            unavailable_sources=unavailable_sources,
        )
