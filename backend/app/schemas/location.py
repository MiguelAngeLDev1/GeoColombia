from pydantic import BaseModel

from app.schemas.earthquake import Earthquake
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


class SeismicContext(BaseModel):
    radius_km: float
    count: int
    returned: int
    earthquakes: list[Earthquake]


class LocationContextResponse(BaseModel):
    location: LocationCoordinates
    territory: TerritoryContext
    mining: MiningContext
    seismic: SeismicContext