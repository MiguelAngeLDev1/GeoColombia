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

class RecentEarthquake(BaseModel):
    id: str
    magnitude: float | None = None
    depth_km: float | None = None
    occurred_at: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None
    location: str | None = None
    max_intensity: int | None = None


class RecentEarthquakeListResponse(BaseModel):
    source: str
    count: int
    data: list[RecentEarthquake]


class LatestEarthquakeResponse(BaseModel):
    source: str
    data: RecentEarthquake | None


class FeltLocation(BaseModel):
    municipality: str | None = None
    population_center: str | None = None
    municipality_code: int | None = None
    population_center_code: int | None = None
    distance_km: float | None = None
    intensity: int | None = None
    reports: int = 0
    latitude: float | None = None
    longitude: float | None = None


class EarthquakeReports(BaseModel):
    count: int = 0
    population_centers: int = 0


class EarthquakeDetail(BaseModel):
    id: str
    magnitude: float | None = None
    depth_km: float | None = None
    occurred_at: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None
    location: str | None = None
    reports: EarthquakeReports
    felt_locations: list[FeltLocation]


class EarthquakeDetailResponse(BaseModel):
    source: str
    data: EarthquakeDetail