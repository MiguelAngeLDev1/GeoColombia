from pydantic import BaseModel

from app.schemas.earthquake import (
    Earthquake,
    RecentEarthquake,
)
from app.schemas.mining import MiningTitle
from app.schemas.territory import Department, Municipality


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


class LocationContextResponse(BaseModel):
    location: LocationCoordinates
    territory: TerritoryContext
    mining: MiningContext
    seismic: SeismicContext