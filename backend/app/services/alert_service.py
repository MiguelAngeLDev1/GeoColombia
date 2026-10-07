from app.integrations.ideam.client import IDEAMClient
from app.schemas.alerts import (
    AlertCoordinates,
    HydrologicalAlert,
    HydrologicalAlertsResponse,
)


ALERT_LEVELS = {
    1: "yellow",
    2: "orange",
    3: "red",
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
                    level=ALERT_LEVELS.get(
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

    @staticmethod
    def _clean_string(
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value or None