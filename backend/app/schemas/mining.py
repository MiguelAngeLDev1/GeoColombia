from datetime import datetime

from pydantic import BaseModel


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class MiningTitle(BaseModel):
    code: str
    area_ha: float | None = None
    registration_date: datetime | None = None
    status: str | None = None
    modality: str | None = None
    stage: str | None = None
    minerals: str | None = None
    departments: str | None = None
    municipalities: str | None = None


class MiningTitleListResponse(BaseModel):
    source: str
    coordinates: Coordinates
    count: int
    data: list[MiningTitle]