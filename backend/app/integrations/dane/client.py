import json

import httpx

from app.core.exceptions import ExternalServiceError


DANE_MUNICIPALITIES_URL = (
    "https://geoportal.dane.gov.co/mparcgis/rest/services/"
    "MGN2025/Serv_CapasMGN_2025/MapServer/317/query"
)

DANE_MUNICIPALITY_FIELDS = (
    "DPTO_CCDGO,"
    "MPIO_CCDGO,"
    "MPIO_CDPMP,"
    "DPTO_CNMBRE,"
    "MPIO_CNMBRE,"
    "MPIO_TIPO,"
    "MPIO_NAREA,"
    "MPIO_NANO"
)


class DANEClient:

    async def get_municipality_at_point(
        self,
        latitude: float,
        longitude: float,
    ) -> dict | None:
        """
        Obtiene el municipio y departamento que contienen
        una coordenada geográfica utilizando el Marco
        Geoestadístico Nacional del DANE.
        """

        geometry = json.dumps(
            {
                "x": longitude,
                "y": latitude,
                "spatialReference": {
                    "wkid": 4326,
                },
            }
        )

        params = {
            "where": "1=1",
            "geometry": geometry,
            "geometryType": "esriGeometryPoint",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": DANE_MUNICIPALITY_FIELDS,
            "returnGeometry": "false",
            "f": "json",
        }

        data = await self._request(params)

        features = data.get("features", [])

        if not features:
            return None

        return features[0].get("attributes")

    async def _request(
        self,
        params: dict,
    ) -> dict:
        """
        Ejecuta una petición al servicio ArcGIS REST del DANE
        y normaliza los errores externos.
        """

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    DANE_MUNICIPALITIES_URL,
                    params=params,
                )

                response.raise_for_status()

        except httpx.TimeoutException as exc:
            raise ExternalServiceError(
                service="DANE",
                message="DANE request timed out",
            ) from exc

        except httpx.HTTPStatusError as exc:
            raise ExternalServiceError(
                service="DANE",
                message=(
                    f"DANE returned HTTP "
                    f"{exc.response.status_code}"
                ),
            ) from exc

        except httpx.RequestError as exc:
            raise ExternalServiceError(
                service="DANE",
                message="Could not connect to DANE",
            ) from exc

        try:
            data = response.json()

        except ValueError as exc:
            raise ExternalServiceError(
                service="DANE",
                message="DANE returned an invalid JSON response",
            ) from exc

        if "error" in data:
            error = data["error"]

            raise ExternalServiceError(
                service="DANE",
                message=error.get(
                    "message",
                    "Unknown DANE error",
                ),
            )

        return data