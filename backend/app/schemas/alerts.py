from typing import Literal

from pydantic import BaseModel


AlertLevel = Literal[
    "yellow",
    "orange",
    "red",
    "unknown",
]


class AlertCoordinates(BaseModel):
    latitude: float
    longitude: float


class HydrologicalAlert(BaseModel):
    id: int | None = None
    type: Literal["hydrological"] = "hydrological"

    level: AlertLevel
    level_code: int | None = None
    level_label: str | None = None

    department: str | None = None

    hydrographic_area_code: int | None = None
    hydrographic_area: str | None = None

    hydrographic_zone_code: int | None = None
    hydrographic_zone: str | None = None

    hydrographic_subzone_code: int | None = None
    hydrographic_subzone: str | None = None


class HydrologicalAlertsResponse(BaseModel):
    source: str
    coordinates: AlertCoordinates
    has_alerts: bool
    count: int
    alerts: list[HydrologicalAlert]


class LandslideAlert(BaseModel):
    id: int | None = None
    type: Literal["landslide"] = "landslide"

    level: AlertLevel
    level_code: int | None = None
    level_label: str | None = None

    department: str | None = None
    municipality: str | None = None
    municipality_code: str | None = None
    region: str | None = None


class LandslideAlertsResponse(BaseModel):
    source: str
    coordinates: AlertCoordinates
    has_alerts: bool
    count: int
    alerts: list[LandslideAlert]


class FireAlert(BaseModel):
    id: int | None = None
    type: Literal["fire"] = "fire"

    level: AlertLevel
    level_code: int | None = None
    level_label: str | None = None

    department: str | None = None
    municipality: str | None = None
    municipality_code: str | None = None
    region: str | None = None


class FireAlertsResponse(BaseModel):
    source: str
    coordinates: AlertCoordinates
    has_alerts: bool
    count: int
    alerts: list[FireAlert]
