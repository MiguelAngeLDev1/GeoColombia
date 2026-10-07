import httpx

from app.core.exceptions import ExternalServiceError


IDEAM_HYDROLOGICAL_ALERTS_URL = (
    "https://visualizador.ideam.gov.co/gisserver/rest/services/"
    "StoryMaps_IDA/Alertas_Hidrologicas/MapServer/2/query"
)


class IDEAMClient:
    async def get_hydrological_alerts_at_point(
        self,
        latitude: float,
        longitude: float,
    ) -> dict:
        params = {
            "geometry": f"{longitude},{latitude}",
            "geometryType": "esriGeometryPoint",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "where": "1=1",
            "outFields": ",".join(
                [
                    "OBJECTID",
                    "ALERTA",
                    "AH",
                    "NOMAH",
                    "ZH",
                    "NOMZH",
                    "SZH",
                    "NOMSZH",
                    "DEP",
                    "DEP_1",
                    "DEP_2",
                    "NIVEL_A",
                ]
            ),
            "returnGeometry": "false",
            "f": "json",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    IDEAM_HYDROLOGICAL_ALERTS_URL,
                    params=params,
                )
                response.raise_for_status()
                payload = response.json()

        except (httpx.HTTPError, ValueError) as exc:
            raise ExternalServiceError(
                service="IDEAM",
                message=(
                    "No fue posible consultar las alertas "
                    "hidrológicas de IDEAM."
                ),
            ) from exc

        if "error" in payload:
            raise ExternalServiceError(
                service="IDEAM",
                message=(
                    "IDEAM respondió con un error al consultar "
                    "las alertas hidrológicas."
                ),
            )

        return payload