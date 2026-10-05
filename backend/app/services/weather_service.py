from app.integrations.weather.client import WeatherClient
from app.schemas.weather import (
    CurrentWeather,
    DailyWeather,
    HourlyWeather,
    WeatherCoordinates,
    WeatherResponse,
)


WEATHER_CODE_DESCRIPTIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


class WeatherService:
    def __init__(self):
        self.weather_client = WeatherClient()

    @staticmethod
    def get_condition(weather_code: int | None) -> str | None:
        if weather_code is None:
            return None

        return WEATHER_CODE_DESCRIPTIONS.get(
            weather_code,
            "Unknown",
        )

    async def get_weather(
        self,
        latitude: float,
        longitude: float,
        forecast_days: int = 7,
        hourly_limit: int = 24,
    ) -> WeatherResponse:
        data = await self.weather_client.get_forecast(
            latitude=latitude,
            longitude=longitude,
            forecast_days=forecast_days,
        )

        current_data = data.get("current", {})
        hourly_data = data.get("hourly", {})
        daily_data = data.get("daily", {})

        current_code = current_data.get("weather_code")
        rain_mm = current_data.get("rain") or 0
        precipitation_mm = current_data.get("precipitation") or 0

        current = CurrentWeather(
            observed_at=current_data.get("time"),
            temperature_c=current_data.get("temperature_2m"),
            feels_like_c=current_data.get("apparent_temperature"),
            humidity_percent=current_data.get("relative_humidity_2m"),
            precipitation_mm=current_data.get("precipitation"),
            rain_mm=current_data.get("rain"),
            is_raining=rain_mm > 0 or precipitation_mm > 0,
            weather_code=current_code,
            condition=self.get_condition(current_code),
            cloud_cover_percent=current_data.get("cloud_cover"),
            pressure_hpa=current_data.get("surface_pressure"),
            wind_speed_kmh=current_data.get("wind_speed_10m"),
            wind_direction_deg=current_data.get("wind_direction_10m"),
            wind_gusts_kmh=current_data.get("wind_gusts_10m"),
        )

        hourly = self._build_hourly(
            hourly_data=hourly_data,
            current_time=current_data.get("time"),
            limit=hourly_limit,
        )

        daily = self._build_daily(daily_data)

        return WeatherResponse(
            source="Open-Meteo",
            timezone=data.get("timezone", "America/Bogota"),
            coordinates=WeatherCoordinates(
                latitude=data.get("latitude", latitude),
                longitude=data.get("longitude", longitude),
            ),
            current=current,
            hourly=hourly,
            daily=daily,
        )

    def _build_hourly(
        self,
        hourly_data: dict,
        current_time: str | None,
        limit: int,
    ) -> list[HourlyWeather]:
        times = hourly_data.get("time", [])

        if not times:
            return []

        start_index = 0

        if current_time is not None:
            start_index = next(
                (
                    index
                    for index, hourly_time in enumerate(times)
                    if hourly_time >= current_time
                ),
                len(times),
            )

        end_index = min(
            start_index + limit,
            len(times),
        )

        result = []

        for index in range(start_index, end_index):
            weather_code = self._get_item(
                hourly_data,
                "weather_code",
                index,
            )

            result.append(
                HourlyWeather(
                    time=times[index],
                    temperature_c=self._get_item(
                        hourly_data,
                        "temperature_2m",
                        index,
                    ),
                    feels_like_c=self._get_item(
                        hourly_data,
                        "apparent_temperature",
                        index,
                    ),
                    precipitation_probability_percent=self._get_item(
                        hourly_data,
                        "precipitation_probability",
                        index,
                    ),
                    precipitation_mm=self._get_item(
                        hourly_data,
                        "precipitation",
                        index,
                    ),
                    rain_mm=self._get_item(
                        hourly_data,
                        "rain",
                        index,
                    ),
                    weather_code=weather_code,
                    condition=self.get_condition(
                        weather_code,
                    ),
                    cloud_cover_percent=self._get_item(
                        hourly_data,
                        "cloud_cover",
                        index,
                    ),
                    wind_speed_kmh=self._get_item(
                        hourly_data,
                        "wind_speed_10m",
                        index,
                    ),
                )
            )

        return result

    def _build_daily(
        self,
        daily_data: dict,
    ) -> list[DailyWeather]:
        dates = daily_data.get("time", [])

        result = []

        for index, day in enumerate(dates):
            weather_code = self._get_item(
                daily_data,
                "weather_code",
                index,
            )

            result.append(
                DailyWeather(
                    date=day,
                    weather_code=weather_code,
                    condition=self.get_condition(weather_code),
                    temperature_max_c=self._get_item(
                        daily_data,
                        "temperature_2m_max",
                        index,
                    ),
                    temperature_min_c=self._get_item(
                        daily_data,
                        "temperature_2m_min",
                        index,
                    ),
                    feels_like_max_c=self._get_item(
                        daily_data,
                        "apparent_temperature_max",
                        index,
                    ),
                    feels_like_min_c=self._get_item(
                        daily_data,
                        "apparent_temperature_min",
                        index,
                    ),
                    precipitation_sum_mm=self._get_item(
                        daily_data,
                        "precipitation_sum",
                        index,
                    ),
                    rain_sum_mm=self._get_item(
                        daily_data,
                        "rain_sum",
                        index,
                    ),
                    precipitation_probability_max_percent=self._get_item(
                        daily_data,
                        "precipitation_probability_max",
                        index,
                    ),
                    wind_speed_max_kmh=self._get_item(
                        daily_data,
                        "wind_speed_10m_max",
                        index,
                    ),
                    wind_gusts_max_kmh=self._get_item(
                        daily_data,
                        "wind_gusts_10m_max",
                        index,
                    ),
                    uv_index_max=self._get_item(
                        daily_data,
                        "uv_index_max",
                        index,
                    ),
                    sunrise=self._get_item(
                        daily_data,
                        "sunrise",
                        index,
                    ),
                    sunset=self._get_item(
                        daily_data,
                        "sunset",
                        index,
                    ),
                )
            )

        return result

    @staticmethod
    def _get_item(
        data: dict,
        key: str,
        index: int,
    ):
        values = data.get(key, [])

        if index >= len(values):
            return None

        return values[index]