import httpx

from app.core.exceptions import ExternalServiceError


SGC_EARTHQUAKES_URL = (
    "https://geoportal.sgc.gov.co/arcgis/rest/services/"
    "catalogo_sismos/catalogo_de_sismos_2/FeatureServer/0/query"
)


EARTHQUAKE_FIELDS = (
    "ESP_ID_EVENTO_TXT,"
    "ESP_MAGNITUD,"
    "ESP_PROFUNDIDAD,"
    "ESP_FECHA_LONG,"
    "ESP_LATITUD,"
    "ESP_LONGITUD,"
    "MUN_CODIGO,"
    "DEPT_CODIGO"
)


class SGCClient:
    async def get_catalog_earthquakes(self) -> list[dict]:
        """
        Consulta el catálogo de sismos del
        Servicio Geológico Colombiano.
        """

        params = {
            "where": "1=1",
            "outFields": EARTHQUAKE_FIELDS,
            "returnGeometry": "false",
            "f": "json",
        }

        data = await self._request(params)

        return data.get("features", [])

    async def get_earthquakes_near_point(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50,
    ) -> list[dict]:
        """
        Consulta sismos cercanos a una coordenada geográfica
        dentro del radio indicado.
        """

        params = {
            "where": "1=1",
            "geometry": f"{longitude},{latitude}",
            "geometryType": "esriGeometryPoint",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "distance": radius_km,
            "units": "esriSRUnit_Kilometer",
            "outFields": EARTHQUAKE_FIELDS,
            "returnGeometry": "false",
            "f": "json",
        }

        data = await self._request(params)

        return data.get("features", [])

    async def _request(
        self,
        params: dict,
    ) -> dict:
        """
        Ejecuta una petición al servicio ArcGIS REST del SGC
        y transforma errores externos en ExternalServiceError.
        """

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    SGC_EARTHQUAKES_URL,
                    params=params,
                )

                response.raise_for_status()

        except httpx.TimeoutException as exc:
            raise ExternalServiceError(
                service="SGC",
                message="SGC request timed out",
            ) from exc

        except httpx.HTTPStatusError as exc:
            raise ExternalServiceError(
                service="SGC",
                message=f"SGC returned HTTP {exc.response.status_code}",
            ) from exc

        except httpx.RequestError as exc:
            raise ExternalServiceError(
                service="SGC",
                message="Could not connect to SGC",
            ) from exc

        try:
            data = response.json()

        except ValueError as exc:
            raise ExternalServiceError(
                service="SGC",
                message="SGC returned an invalid JSON response",
            ) from exc

        if "error" in data:
            error = data["error"]

            raise ExternalServiceError(
                service="SGC",
                message=error.get(
                    "message",
                    "Unknown SGC error",
                ),
            )

        return data