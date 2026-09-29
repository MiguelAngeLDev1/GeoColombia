from app.integrations.dane.client import DANEClient
from app.schemas.territory import (
    Department,
    Municipality,
    TerritoryCoordinates,
    TerritoryResponse,
)


class TerritoryService:

    def __init__(self):
        self.dane_client = DANEClient()

    async def get_territory_at_point(
        self,
        latitude: float,
        longitude: float,
    ) -> TerritoryResponse:
        """
        Obtiene el contexto territorial oficial de una coordenada
        utilizando el Marco Geoestadístico Nacional del DANE.
        """

        attributes = await self.dane_client.get_municipality_at_point(
            latitude=latitude,
            longitude=longitude,
        )

        coordinates = TerritoryCoordinates(
            latitude=latitude,
            longitude=longitude,
        )

        if attributes is None:
            return TerritoryResponse(
                source="DANE - Marco Geoestadístico Nacional",
                coordinates=coordinates,
                department=None,
                municipality=None,
                reference_year=None,
            )

        department = Department(
            code=str(attributes["DPTO_CCDGO"]),
            name=str(attributes["DPTO_CNMBRE"]).title(),
        )

        municipality = Municipality(
            code=str(attributes["MPIO_CDPMP"]),
            name=str(attributes["MPIO_CNMBRE"]).title(),
            type=(
                str(attributes["MPIO_TIPO"]).title()
                if attributes.get("MPIO_TIPO") is not None
                else None
            ),
            area_km2=attributes.get("MPIO_NAREA"),
        )

        return TerritoryResponse(
            source="DANE - Marco Geoestadístico Nacional",
            coordinates=coordinates,
            department=department,
            municipality=municipality,
            reference_year=attributes.get("MPIO_NANO"),
        )