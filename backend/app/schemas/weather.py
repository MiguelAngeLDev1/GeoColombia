from datetime import date, datetime

from pydantic import BaseModel


class WeatherCoordinates(BaseModel):
    latitude: float
    longitude: float


class CurrentWeather(BaseModel):
    observed_at: datetime | None = None
    temperature_c: float | None = None
    feels_like_c: float | None = None
    humidity_percent: int | None = None
    precipitation_mm: float | None = None
    rain_mm: float | None = None
    is_raining: bool
    weather_code: int | None = None
    condition: str | None = None
    cloud_cover_percent: int | None = None
    pressure_hpa: float | None = None
    wind_speed_kmh: float | None = None
    wind_direction_deg: int | None = None
    wind_gusts_kmh: float | None = None


class HourlyWeather(BaseModel):
    time: datetime
    temperature_c: float | None = None
    feels_like_c: float | None = None
    precipitation_probability_percent: int | None = None
    precipitation_mm: float | None = None
    rain_mm: float | None = None
    weather_code: int | None = None
    condition: str | None = None
    cloud_cover_percent: int | None = None
    wind_speed_kmh: float | None = None


class DailyWeather(BaseModel):
    date: date
    weather_code: int | None = None
    condition: str | None = None
    temperature_max_c: float | None = None
    temperature_min_c: float | None = None
    feels_like_max_c: float | None = None
    feels_like_min_c: float | None = None
    precipitation_sum_mm: float | None = None
    rain_sum_mm: float | None = None
    precipitation_probability_max_percent: int | None = None
    wind_speed_max_kmh: float | None = None
    wind_gusts_max_kmh: float | None = None
    uv_index_max: float | None = None
    sunrise: datetime | None = None
    sunset: datetime | None = None


class WeatherResponse(BaseModel):
    source: str
    timezone: str
    coordinates: WeatherCoordinates
    current: CurrentWeather
    hourly: list[HourlyWeather]
    daily: list[DailyWeather]