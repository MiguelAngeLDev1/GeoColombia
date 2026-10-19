import httpx

from app.core.exceptions import ExternalServiceError


IDEAM_HYDROLOGICAL_ALERTS_URL = (
    "https://visualizador.ideam.gov.co/gisserver/rest/services/"
    "StoryMaps_IDA/Alertas_Hidrologicas/MapServer/2/query"
)

IDEAM_LANDSLIDE_ALERTS_URL = (
    "https://visualizador.ideam.gov.co/gisserver/rest/services/"
    "StoryMaps_IDA/Alertas__IDD/MapServer/1/query"
)

IDEAM_FIRE_ALERTS_URL = (
    "https://visualizador.ideam.gov.co/gisserver/rest/services/"
    "StoryMaps_IDA/Alertas_ICV/MapServer/2/query"
)

IDEAM_MUNICIPAL_THREAT_FIELDS = (
    "OBJECTID,"
    "DPTO_CCDGO,"
    "MPIO_CCDGO,"
    "MPIO_CDPMP,"
    "DPTO_CNMBR,"
    "MPIO_CNMBR,"
    "DEPARTAMEN,"
    "MUNICIPIO,"
    "COD_DANE,"
    "REGION,"
    "PROBABILID"
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

        return await self._request(
            url=IDEAM_HYDROLOGICAL_ALERTS_URL,
            params=params,
            failure_message=(
                "No fue posible consultar las alertas "
                "hidrológicas de IDEAM."
            ),
            arcgis_error_message=(
                "IDEAM respondió con un error al consultar "
                "las alertas hidrológicas."
            ),
        )

    async def get_landslide_alerts_at_point(
        self,
        latitude: float,
        longitude: float,
    ) -> dict:
        return await self._request_municipal_threat_at_point(
            url=IDEAM_LANDSLIDE_ALERTS_URL,
            latitude=latitude,
            longitude=longitude,
            failure_message=(
                "No fue posible consultar las alertas "
                "por deslizamientos de IDEAM."
            ),
            arcgis_error_message=(
                "IDEAM respondió con un error al consultar "
                "las alertas por deslizamientos."
            ),
        )

    async def get_fire_alerts_at_point(
        self,
        latitude: float,
        longitude: float,
    ) -> dict:
        return await self._request_municipal_threat_at_point(
            url=IDEAM_FIRE_ALERTS_URL,
            latitude=latitude,
            longitude=longitude,
            failure_message=(
                "No fue posible consultar las alertas "
                "por incendios de cobertura vegetal de IDEAM."
            ),
            arcgis_error_message=(
                "IDEAM respondió con un error al consultar "
                "las alertas por incendios de cobertura vegetal."
            ),
        )

    async def _request_municipal_threat_at_point(
        self,
        *,
        url: str,
        latitude: float,
        longitude: float,
        failure_message: str,
        arcgis_error_message: str,
    ) -> dict:
        params = {
            "geometry": f"{longitude},{latitude}",
            "geometryType": "esriGeometryPoint",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "where": "1=1",
            "outFields": IDEAM_MUNICIPAL_THREAT_FIELDS,
            "returnGeometry": "false",
            "f": "json",
        }

        return await self._request(
            url=url,
            params=params,
            failure_message=failure_message,
            arcgis_error_message=arcgis_error_message,
        )

    async def _request(
        self,
        *,
        url: str,
        params: dict,
        failure_message: str,
        arcgis_error_message: str,
    ) -> dict:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    url,
                    params=params,
                )
                response.raise_for_status()
                payload = response.json()

        except (httpx.HTTPError, ValueError) as exc:
            raise ExternalServiceError(
                service="IDEAM",
                message=failure_message,
            ) from exc

        if "error" in payload:
            raise ExternalServiceError(
                service="IDEAM",
                message=arcgis_error_message,
            )

        return payload
