from pydantic import BaseModel


class TerritoryCoordinates(BaseModel):
    latitude: float
    longitude: float


class Department(BaseModel):
    code: str
    name: str


class Municipality(BaseModel):
    code: str
    name: str
    type: str | None = None
    area_km2: float | None = None


class TerritoryResponse(BaseModel):
    source: str
    coordinates: TerritoryCoordinates
    department: Department | None = None
    municipality: Municipality | None = None
    reference_year: int | None = None