from app.integrations.ideam.client import IDEAMClient
from app.schemas.alerts import (
    AlertCoordinates,
    AlertLevel,
    FireAlert,
    FireAlertsResponse,
    HydrologicalAlert,
    HydrologicalAlertsResponse,
    LandslideAlert,
    LandslideAlertsResponse,
)


HYDROLOGICAL_ALERT_LEVELS = {
    1: "yellow",
    2: "orange",
    3: "red",
}

MUNICIPAL_THREAT_LEVELS = {
    1: "yellow",
    2: "orange",
    3: "red",
}

MUNICIPAL_THREAT_LEVEL_LABELS = {
    1: "AMENAZA BAJA",
    2: "AMENAZA MODERADA",
    3: "AMENAZA ALTA",
}


class AlertService:

    def __init__(self):
        self.ideam_client = IDEAMClient()

    async def get_hydrological_alerts(
        self,
        latitude: float,
        longitude: float,
    ) -> HydrologicalAlertsResponse:
        payload = (
            await self.ideam_client.get_hydrological_alerts_at_point(
                latitude=latitude,
                longitude=longitude,
            )
        )

        alerts = []

        for feature in payload.get("features", []):
            attributes = feature.get("attributes", {})

            level_code = attributes.get("ALERTA")

            alerts.append(
                HydrologicalAlert(
                    id=attributes.get("OBJECTID"),
                    level=HYDROLOGICAL_ALERT_LEVELS.get(
                        level_code,
                        "unknown",
                    ),
                    level_code=level_code,
                    level_label=self._clean_string(
                        attributes.get("NIVEL_A")
                    ),
                    department=self._clean_string(
                        attributes.get("DEP")
                    ),
                    hydrographic_area_code=attributes.get("AH"),
                    hydrographic_area=self._clean_string(
                        attributes.get("NOMAH")
                    ),
                    hydrographic_zone_code=attributes.get("ZH"),
                    hydrographic_zone=self._clean_string(
                        attributes.get("NOMZH")
                    ),
                    hydrographic_subzone_code=attributes.get("SZH"),
                    hydrographic_subzone=self._clean_string(
                        attributes.get("NOMSZH")
                    ),
                )
            )

        return HydrologicalAlertsResponse(
            source="IDEAM",
            coordinates=AlertCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            has_alerts=len(alerts) > 0,
            count=len(alerts),
            alerts=alerts,
        )

    async def get_landslide_alerts(
        self,
        latitude: float,
        longitude: float,
    ) -> LandslideAlertsResponse:
        payload = (
            await self.ideam_client.get_landslide_alerts_at_point(
                latitude=latitude,
                longitude=longitude,
            )
        )

        alerts = self._municipal_threat_alerts(
            payload=payload,
            alert_type="landslide",
        )

        return LandslideAlertsResponse(
            source="IDEAM",
            coordinates=AlertCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            has_alerts=len(alerts) > 0,
            count=len(alerts),
            alerts=alerts,
        )

    async def get_fire_alerts(
        self,
        latitude: float,
        longitude: float,
    ) -> FireAlertsResponse:
        payload = await self.ideam_client.get_fire_alerts_at_point(
            latitude=latitude,
            longitude=longitude,
        )

        alerts = self._municipal_threat_alerts(
            payload=payload,
            alert_type="fire",
        )

        return FireAlertsResponse(
            source="IDEAM",
            coordinates=AlertCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            has_alerts=len(alerts) > 0,
            count=len(alerts),
            alerts=alerts,
        )

    def _municipal_threat_alerts(
        self,
        *,
        payload: dict,
        alert_type: str,
    ) -> list[LandslideAlert] | list[FireAlert]:
        alerts = []

        for feature in payload.get("features", []):
            attributes = feature.get("attributes", {})
            probability = self._normalize_probability(
                attributes.get("PROBABILID")
            )

            # Sin amenaza vigente para el municipio.
            if probability == 0:
                continue

            level, level_label = self._map_municipal_threat_level(
                probability
            )

            alert_data = {
                "id": attributes.get("OBJECTID"),
                "level": level,
                "level_code": (
                    probability
                    if isinstance(probability, int)
                    else None
                ),
                "level_label": level_label,
                "department": self._department_name(attributes),
                "municipality": self._municipality_name(attributes),
                "municipality_code": self._municipality_code(
                    attributes
                ),
                "region": self._clean_string(
                    attributes.get("REGION")
                ),
            }

            if alert_type == "landslide":
                alerts.append(LandslideAlert(**alert_data))
            else:
                alerts.append(FireAlert(**alert_data))

        return alerts

    @staticmethod
    def _normalize_probability(value):
        if value is None:
            return None

        if isinstance(value, bool):
            return value

        if isinstance(value, float):
            if value != value:  # NaN
                return None
            if value == int(value):
                return int(value)
            return value

        if isinstance(value, int):
            return value

        return value

    @staticmethod
    def _map_municipal_threat_level(
        probability,
    ) -> tuple[AlertLevel, str | None]:
        if probability in MUNICIPAL_THREAT_LEVELS:
            return (
                MUNICIPAL_THREAT_LEVELS[probability],
                MUNICIPAL_THREAT_LEVEL_LABELS[probability],
            )

        # Valor no reconocido: no se trata como "sin alerta".
        return (
            "unknown",
            "AMENAZA NO RECONOCIDA",
        )

    def _department_name(
        self,
        attributes: dict,
    ) -> str | None:
        return self._clean_string(
            attributes.get("DPTO_CNMBR")
        ) or self._clean_string(
            attributes.get("DEPARTAMEN")
        )

    def _municipality_name(
        self,
        attributes: dict,
    ) -> str | None:
        return self._clean_string(
            attributes.get("MPIO_CNMBR")
        ) or self._clean_string(
            attributes.get("MUNICIPIO")
        )

    def _municipality_code(
        self,
        attributes: dict,
    ) -> str | None:
        value = attributes.get("MPIO_CDPMP")

        if value is None:
            value = attributes.get("COD_DANE")

        if value is None:
            return None

        if isinstance(value, float):
            if value != value:  # NaN
                return None
            value = int(value)

        if isinstance(value, int):
            if value == 0:
                return None
            return str(value).zfill(5)

        text = str(value).strip()

        if not text or text == "0":
            return None

        if text.isdigit():
            return text.zfill(5)

        return text

    @staticmethod
    def _clean_string(
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        if not isinstance(value, str):
            value = str(value)

        value = value.strip()

        return value or None
