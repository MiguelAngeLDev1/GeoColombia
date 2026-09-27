from datetime import datetime, timedelta, timezone
from math import asin, cos, radians, sin, sqrt

from app.integrations.sgc.client import SGCClient
from app.schemas.earthquake import (
    Coordinates,
    Earthquake,
    EarthquakeListResponse,
    NearbyEarthquakeResponse,
)


class EarthquakeService:

    def __init__(self):
        self.sgc_client = SGCClient()

    @staticmethod
    def timestamp_ms_to_datetime(
        timestamp_ms: int | float | None,
    ) -> datetime | None:
        """
        Convierte un timestamp Unix expresado en milisegundos
        a datetime UTC.

        Se utiliza epoch + timedelta para soportar timestamps
        negativos de forma portable, especialmente en Windows.
        """

        if timestamp_ms is None:
            return None

        try:
            epoch = datetime(
                1970,
                1,
                1,
                tzinfo=timezone.utc,
            )

            return epoch + timedelta(
                milliseconds=float(timestamp_ms),
            )

        except (TypeError, ValueError, OverflowError):
            return None

    @staticmethod
    def from_sgc_feature(feature: dict) -> Earthquake:
        """
        Convierte una feature del SGC al modelo interno Earthquake.
        """

        attributes = feature["attributes"]

        occurred_at = EarthquakeService.timestamp_ms_to_datetime(
            attributes.get("ESP_FECHA_LONG")
        )

        return Earthquake(
            id=attributes["ESP_ID_EVENTO_TXT"],
            magnitude=attributes.get("ESP_MAGNITUD"),
            depth_km=attributes.get("ESP_PROFUNDIDAD"),
            occurred_at=occurred_at,
            latitude=attributes.get("ESP_LATITUD"),
            longitude=attributes.get("ESP_LONGITUD"),
            municipality_code=attributes.get("MUN_CODIGO"),
            department_code=attributes.get("DEPT_CODIGO"),
        )

    async def get_catalog(
        self,
        limit: int,
    ) -> EarthquakeListResponse:
        """
        Obtiene eventos del catálogo sísmico del SGC.
        """

        features = await self.sgc_client.get_catalog_earthquakes()

        earthquakes = [
            self.from_sgc_feature(feature)
            for feature in features[:limit]
        ]

        return EarthquakeListResponse(
            source="Servicio Geológico Colombiano",
            count=len(earthquakes),
            data=earthquakes,
        )

    @staticmethod
    def calculate_distance_km(
        latitude1: float,
        longitude1: float,
        latitude2: float,
        longitude2: float,
    ) -> float:
        """
        Calcula la distancia entre dos coordenadas geográficas
        mediante la fórmula de Haversine.
        """

        earth_radius_km = 6371.0088

        lat1 = radians(latitude1)
        lon1 = radians(longitude1)
        lat2 = radians(latitude2)
        lon2 = radians(longitude2)

        delta_lat = lat2 - lat1
        delta_lon = lon2 - lon1

        a = (
            sin(delta_lat / 2) ** 2
            + cos(lat1)
            * cos(lat2)
            * sin(delta_lon / 2) ** 2
        )

        c = 2 * asin(sqrt(a))

        return earth_radius_km * c

    async def get_nearby_earthquakes(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50,
    ) -> NearbyEarthquakeResponse:
        """
        Obtiene sismos cercanos a una coordenada, calcula
        su distancia, los ordena del más cercano al más lejano
        y devuelve una respuesta estructurada.
        """

        features = await self.sgc_client.get_earthquakes_near_point(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
        )

        earthquakes: list[Earthquake] = []

        for feature in features:
            earthquake = self.from_sgc_feature(feature)

            if (
                earthquake.latitude is not None
                and earthquake.longitude is not None
            ):
                earthquake.distance_km = round(
                    self.calculate_distance_km(
                        latitude,
                        longitude,
                        earthquake.latitude,
                        earthquake.longitude,
                    ),
                    2,
                )

            earthquakes.append(earthquake)

        earthquakes.sort(
            key=lambda earthquake: (
                earthquake.distance_km
                if earthquake.distance_km is not None
                else float("inf")
            )
        )

        return NearbyEarthquakeResponse(
            source="Servicio Geológico Colombiano",
            center=Coordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            radius_km=radius_km,
            count=len(earthquakes),
            data=earthquakes,
        )