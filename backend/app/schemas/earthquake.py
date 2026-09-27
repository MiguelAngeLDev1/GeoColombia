from datetime import datetime

from pydantic import BaseModel


class Earthquake(BaseModel):
    id: int
    magnitude: float | None
    depth_km: float | None
    occurred_at: datetime | None
    latitude: float | None
    longitude: float | None
    municipality_code: str | None = None
    department_code: str | None = None
    distance_km: float | None = None


class EarthquakeListResponse(BaseModel):
    source: str
    count: int
    data: list[Earthquake]


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class NearbyEarthquakeResponse(BaseModel):
    source: str
    center: Coordinates
    radius_km: float
    count: int
    data: list[Earthquake]