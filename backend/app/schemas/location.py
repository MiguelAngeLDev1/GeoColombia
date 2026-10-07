from datetime import datetime

from pydantic import BaseModel

from app.schemas.earthquake import (
    Earthquake,
    RecentEarthquake,
)
from app.schemas.mining import MiningTitle
from app.schemas.territory import Department, Municipality
from app.schemas.alerts import HydrologicalAlert


class LocationCoordinates(BaseModel):
    latitude: float
    longitude: float


class TerritoryContext(BaseModel):
    department: Department | None = None
    municipality: Municipality | None = None
    reference_year: int | None = None


class MiningContext(BaseModel):
    has_titles: bool
    count: int
    titles: list[MiningTitle]


class RecentSeismicContext(BaseModel):
    count: int
    returned: int
    earthquakes: list[RecentEarthquake]


class SeismicContext(BaseModel):
    radius_km: float
    count: int
    returned: int
    earthquakes: list[Earthquake]
    recent: RecentSeismicContext


class CurrentWeatherContext(BaseModel):
    observed_at: datetime | None = None
    temperature_c: float | None = None
    feels_like_c: float | None = None
    condition: str | None = None
    humidity_percent: int | None = None
    precipitation_mm: float | None = None
    is_raining: bool
    wind_speed_kmh: float | None = None


class TodayWeatherContext(BaseModel):
    temperature_min_c: float | None = None
    temperature_max_c: float | None = None
    precipitation_probability_max_percent: int | None = None
    precipitation_sum_mm: float | None = None
    uv_index_max: float | None = None


class NextHourWeatherContext(BaseModel):
    time: datetime
    temperature_c: float | None = None
    condition: str | None = None
    precipitation_probability_percent: int | None = None
    rain_mm: float | None = None


class WeatherContext(BaseModel):
    source: str
    timezone: str
    current: CurrentWeatherContext
    today: TodayWeatherContext | None = None
    next_hours: list[NextHourWeatherContext]


class HydrologicalAlertsContext(BaseModel):
    has_alerts: bool
    count: int
    alerts: list[HydrologicalAlert]


class AlertsContext(BaseModel):
    source: str
    hydrological: HydrologicalAlertsContext


class LocationContextResponse(BaseModel):
    location: LocationCoordinates
    territory: TerritoryContext
    weather: WeatherContext
    alerts: AlertsContext
    mining: MiningContext
    seismic: SeismicContext
