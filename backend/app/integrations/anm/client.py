import json

import httpx

from app.core.exceptions import ExternalServiceError


ANM_MINING_TITLES_URL = (
    "https://geo.anm.gov.co/webgis/rest/services/"
    "ANM/ServiciosANM/MapServer/4/query"
)


class ANMClient:
    async def get_mining_titles_at_point(
        self,
        latitude: float,
        longitude: float,
    ) -> list[dict]:
        """
        Consulta los títulos mineros vigentes que intersectan
        una coordenada geográfica.
        """

        geometry = {
            "x": longitude,
            "y": latitude,
            "spatialReference": {
                "wkid": 4686,
            },
        }

        params = {
            "where": "1=1",
            "geometry": json.dumps(geometry),
            "geometryType": "esriGeometryPoint",
            "inSR": "4686",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": (
                "CODIGO_EXPEDIENTE,"
                "AREA_HA,"
                "FECHA_DE_INSCRIPCION,"
                "ESTADO,"
                "MODALIDAD,"
                "ETAPA,"
                "MINERALES,"
                "DEPARTAMENTOS,"
                "MUNICIPIOS"
            ),
            "returnGeometry": "false",
            "f": "json",
        }

        data = await self._request(params)

        return data.get("features", [])

    async def get_sample_mining_title(self) -> dict:
        """
        Obtiene temporalmente un título minero de ejemplo
        incluyendo su geometría.

        Este método se utiliza únicamente para validar
        las consultas espaciales durante el desarrollo.
        """

        params = {
            "where": "1=1",
            "outFields": (
                "CODIGO_EXPEDIENTE,"
                "AREA_HA,"
                "FECHA_DE_INSCRIPCION,"
                "ESTADO,"
                "MODALIDAD,"
                "ETAPA,"
                "MINERALES,"
                "DEPARTAMENTOS,"
                "MUNICIPIOS"
            ),
            "returnGeometry": "true",
            "resultRecordCount": 1,
            "f": "json",
        }

        data = await self._request(params)

        features = data.get("features", [])

        if not features:
            return {}

        return features[0]

    async def _request(
        self,
        params: dict,
    ) -> dict:
        """
        Ejecuta una petición al servicio ArcGIS REST de ANM
        y transforma los errores externos en ExternalServiceError.
        """

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    ANM_MINING_TITLES_URL,
                    params=params,
                )

                response.raise_for_status()

        except httpx.TimeoutException as exc:
            raise ExternalServiceError(
                service="ANM",
                message="ANM request timed out",
            ) from exc

        except httpx.HTTPStatusError as exc:
            raise ExternalServiceError(
                service="ANM",
                message=f"ANM returned HTTP {exc.response.status_code}",
            ) from exc

        except httpx.RequestError as exc:
            raise ExternalServiceError(
                service="ANM",
                message="Could not connect to ANM",
            ) from exc

        try:
            data = response.json()

        except ValueError as exc:
            raise ExternalServiceError(
                service="ANM",
                message="ANM returned an invalid JSON response",
            ) from exc

        if "error" in data:
            error = data["error"]

            raise ExternalServiceError(
                service="ANM",
                message=error.get(
                    "message",
                    "Unknown ANM error",
                ),
            )

        return data