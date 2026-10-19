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

IDEAM_HYDROLOGICAL_LAYER_FIELDS = (
    "OBJECTID,"
    "ALERTA,"
    "NIVEL_A,"
    "AH,"
    "NOMAH,"
    "ZH,"
    "NOMZH,"
    "SZH,"
    "NOMSZH,"
    "DEP,"
    "DEP_1,"
    "DEP_2"
)

IDEAM_MUNICIPAL_LAYER_FIELDS = (
    "OBJECTID,"
    "PROBABILID,"
    "DPTO_CCDGO,"
    "MPIO_CCDGO,"
    "MPIO_CDPMP,"
    "DPTO_CNMBR,"
    "MPIO_CNMBR,"
    "DEPARTAMEN,"
    "MUNICIPIO,"
    "COD_DANE,"
    "REGION"
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

    async def query_layer_geojson(
        self,
        *,
        url: str,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        where: str,
        out_fields: str,
        result_offset: int = 0,
        result_record_count: int = 50,
        timeout_seconds: float = 25.0,
    ) -> dict:
        """
        Consulta una capa IDEAM por bbox y devuelve GeoJSON crudo.

        No altera las consultas por punto existentes.
        """

        params = {
            "where": where,
            "geometry": (
                f"{min_lon},{min_lat},{max_lon},{max_lat}"
            ),
            "geometryType": "esriGeometryEnvelope",
            "inSR": "4326",
            "outSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": out_fields,
            "returnGeometry": "true",
            "f": "geojson",
            "resultOffset": result_offset,
            "resultRecordCount": result_record_count,
            "orderByFields": "OBJECTID ASC",
        }

        return await self._request(
            url=url,
            params=params,
            failure_message=(
                "No fue posible consultar la capa GeoJSON de IDEAM."
            ),
            arcgis_error_message=(
                "IDEAM respondió con un error al consultar "
                "la capa GeoJSON solicitada."
            ),
            timeout_seconds=timeout_seconds,
            expect_geojson=True,
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
        timeout_seconds: float = 20.0,
        expect_geojson: bool = False,
    ) -> dict:
        try:
            async with httpx.AsyncClient(
                timeout=timeout_seconds,
            ) as client:
                response = await client.get(
                    url,
                    params=params,
                )
                response.raise_for_status()
                payload = response.json()

        except httpx.TimeoutException as exc:
            raise ExternalServiceError(
                service="IDEAM",
                message=(
                    "La consulta a IDEAM agotó el tiempo de espera."
                ),
            ) from exc

        except (httpx.HTTPError, ValueError) as exc:
            raise ExternalServiceError(
                service="IDEAM",
                message=failure_message,
            ) from exc

        if not isinstance(payload, dict):
            raise ExternalServiceError(
                service="IDEAM",
                message=(
                    "IDEAM devolvió una respuesta JSON inesperada."
                ),
            )

        if "error" in payload:
            raise ExternalServiceError(
                service="IDEAM",
                message=arcgis_error_message,
            )

        if expect_geojson:
            geojson_type = payload.get("type")
            # ArcGIS suele devolver FeatureCollection; si omite type,
            # la normalización del servicio valida features/geometry.
            if (
                geojson_type is not None
                and geojson_type != "FeatureCollection"
            ):
                raise ExternalServiceError(
                    service="IDEAM",
                    message=(
                        "IDEAM devolvió un GeoJSON con tipo no soportado."
                    ),
                )

        return payload
