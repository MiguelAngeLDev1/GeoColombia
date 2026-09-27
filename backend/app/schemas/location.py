from pydantic import BaseModel

from app.schemas.earthquake import Earthquake
from app.schemas.mining import MiningTitle


class LocationCoordinates(BaseModel):
    latitude: float
    longitude: float


class MiningContext(BaseModel):
    has_titles: bool
    count: int
    titles: list[MiningTitle]


class SeismicContext(BaseModel):
    radius_km: float
    count: int
    earthquakes: list[Earthquake]


class LocationContextResponse(BaseModel):
    location: LocationCoordinates
    mining: MiningContext
    seismic: SeismicContext