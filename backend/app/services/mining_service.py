from datetime import datetime, timezone

from app.integrations.anm.client import ANMClient
from app.schemas.mining import (
    Coordinates,
    MiningTitle,
    MiningTitleListResponse,
)


class MiningService:

    def __init__(self):
        self.anm_client = ANMClient()

    @staticmethod
    def from_anm_feature(feature: dict) -> MiningTitle:
        attributes = feature.get("attributes", {})

        timestamp_ms = attributes.get("FECHA_DE_INSCRIPCION")

        registration_date = None

        if timestamp_ms is not None:
            registration_date = datetime.fromtimestamp(
                timestamp_ms / 1000,
                tz=timezone.utc,
            )

        return MiningTitle(
            code=attributes["CODIGO_EXPEDIENTE"],
            area_ha=attributes.get("AREA_HA"),
            registration_date=registration_date,
            status=attributes.get("ESTADO"),
            modality=attributes.get("MODALIDAD"),
            stage=attributes.get("ETAPA"),
            minerals=attributes.get("MINERALES"),
            departments=attributes.get("DEPARTAMENTOS"),
            municipalities=attributes.get("MUNICIPIOS"),
        )

    async def get_titles_at_point(
        self,
        latitude: float,
        longitude: float,
    ) -> MiningTitleListResponse:

        features = await self.anm_client.get_mining_titles_at_point(
            latitude=latitude,
            longitude=longitude,
        )

        titles = [
            self.from_anm_feature(feature)
            for feature in features
        ]

        return MiningTitleListResponse(
            source="Agencia Nacional de Minería",
            coordinates=Coordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            count=len(titles),
            data=titles,
        )