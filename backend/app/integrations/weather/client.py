import httpx

from app.core.exceptions import ExternalServiceError


OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


class WeatherClient:
    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        forecast_days: int = 7,
    ) -> dict:
        """
        Consulta las condiciones meteorológicas actuales
        y el pronóstico para una coordenada geográfica.
        """

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": ",".join(
                [
                    "temperature_2m",
                    "apparent_temperature",
                    "relative_humidity_2m",
                    "precipitation",
                    "rain",
                    "weather_code",
                    "cloud_cover",
                    "surface_pressure",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "wind_gusts_10m",
                ]
            ),
            "hourly": ",".join(
                [
                    "temperature_2m",
                    "apparent_temperature",
                    "precipitation_probability",
                    "precipitation",
                    "rain",
                    "weather_code",
                    "cloud_cover",
                    "wind_speed_10m",
                ]
            ),
            "daily": ",".join(
                [
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "apparent_temperature_max",
                    "apparent_temperature_min",
                    "precipitation_sum",
                    "rain_sum",
                    "precipitation_probability_max",
                    "wind_speed_10m_max",
                    "wind_gusts_10m_max",
                    "uv_index_max",
                    "sunrise",
                    "sunset",
                ]
            ),
            "timezone": "America/Bogota",
            "forecast_days": forecast_days,
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    OPEN_METEO_FORECAST_URL,
                    params=params,
                )
                response.raise_for_status()

                return response.json()

        except (httpx.HTTPError, ValueError) as exc:
            raise ExternalServiceError(
                service="Open-Meteo",
                message=(
                    "No fue posible consultar el servicio "
                    "meteorológico."
                ),
            ) from exc