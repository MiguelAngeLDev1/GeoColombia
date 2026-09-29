import asyncio
from datetime import datetime, timedelta, timezone
from math import asin, cos, radians, sin, sqrt
from app.services.territory_service import TerritoryService

from app.integrations.sgc.client import SGCClient
from app.schemas.earthquake import (
    Coordinates,
    Earthquake,
    EarthquakeDetail,
    EarthquakeDetailResponse,
    EarthquakeListResponse,
    EarthquakeReports,
    EarthquakeTerritory,
    FeltLocation,
    LatestEarthquakeResponse,
    NearbyEarthquakeResponse,
    RecentEarthquake,
    RecentEarthquakeListResponse,
)

class EarthquakeService:

    def __init__(self):
        self.sgc_client = SGCClient()
        self.territory_service = TerritoryService()

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

    @staticmethod
    def from_sgc_recent_event(
        event: dict,
    ) -> RecentEarthquake:
        """
        Convierte un evento del servicio Sismos Sentidos del SGC
        al modelo interno RecentEarthquake.
        """

        timestamp = event.get("TIME_VALUE")

        occurred_at = None

        if timestamp is not None:
            try:
                occurred_at = datetime.fromtimestamp(
                    float(timestamp),
                    tz=timezone.utc,
                )
            except (TypeError, ValueError, OverflowError, OSError):
                occurred_at = None

        return RecentEarthquake(
            id=str(event["ID_SISMO"]),
            magnitude=event.get("MAGNITUD"),
            depth_km=event.get("PROFUNDIDAD"),
            occurred_at=occurred_at,
            latitude=event.get("LATITUD"),
            longitude=event.get("LONGITUD"),
            location=event.get("SITIO"),
            max_intensity=event.get("I_MAX"),
        )

    async def get_recent_earthquakes(
        self,
        limit: int = 20,
    ) -> RecentEarthquakeListResponse:
        """
        Obtiene los sismos recientes publicados por el SGC,
        los normaliza y ordena del más reciente al más antiguo.
        """

        events = await self.sgc_client.get_recent_earthquakes()

        earthquakes = [
            self.from_sgc_recent_event(event)
            for event in events
        ]

        earthquakes.sort(
            key=lambda earthquake: (
                earthquake.occurred_at
                if earthquake.occurred_at is not None
                else datetime.min.replace(tzinfo=timezone.utc)
            ),
            reverse=True,
        )

        earthquakes = earthquakes[:limit]

        return RecentEarthquakeListResponse(
            source="Servicio Geológico Colombiano",
            count=len(earthquakes),
            data=earthquakes,
        )

    async def get_latest_earthquake(
        self,
    ) -> LatestEarthquakeResponse:
        """
        Obtiene el sismo más reciente publicado por el SGC.
        """

        recent = await self.get_recent_earthquakes(
            limit=1,
        )

        earthquake = (
            recent.data[0]
            if recent.data
            else None
        )

        return LatestEarthquakeResponse(
            source=recent.source,
            data=earthquake,
        )

    @staticmethod
    def safe_float(value) -> float | None:
        """
        Convierte un valor a float de forma segura.
        """

        if value is None or value == "":
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def safe_int(value) -> int | None:
        """
        Convierte un valor a int de forma segura.
        """

        if value is None or value == "":
            return None

        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def parse_felt_earthquake_datetime(
        value: str | None,
    ) -> datetime | None:
        """
        Convierte las fechas utilizadas por Sismos Sentidos
        a datetime UTC.
        """

        if not value:
            return None

        formats = (
            "%d/%m/%Y %H:%M:%S",
            "%Y/%m/%d %I:%M:%S %p",
        )

        for date_format in formats:
            try:
                parsed = datetime.strptime(
                    value,
                    date_format,
                )

                return parsed.replace(
                    tzinfo=timezone.utc,
                )
            except ValueError:
                continue

        return None

    @classmethod
    def from_sgc_felt_location(
        cls,
        data: dict,
    ) -> FeltLocation:
        """
        Normaliza un lugar donde un sismo fue reportado
        como sentido.
        """

        return FeltLocation(
            municipality=data.get("MUNICIPIO"),
            population_center=data.get(
                "NOMBRE_CENTRO_POBLADO"
            ),
            municipality_code=cls.safe_int(
                data.get("COD_MUNICIPIO")
            ),
            population_center_code=cls.safe_int(
                data.get("COD_CENTRO_POBLADO")
            ),
            distance_km=cls.safe_float(
                data.get("DIST")
            ),
            intensity=cls.safe_int(
                data.get("INT_RED")
            ),
            reports=cls.safe_int(
                data.get("CONTEO")
            ) or 0,
            latitude=cls.safe_float(
                data.get("LATITUD")
            ),
            longitude=cls.safe_float(
                data.get("LONGITUD")
            ),
        )

    async def get_earthquake_detail(
        self,
        earthquake_id: str,
    ) -> EarthquakeDetailResponse:
        """
        Obtiene y combina el resumen, número de reportes,
        lugares donde fue sentido un sismo y su contexto
        territorial oficial según DANE.
        """

        summary, report_count, felt_locations = await asyncio.gather(
            self.sgc_client.get_earthquake_summary(
                earthquake_id
            ),
            self.sgc_client.get_earthquake_report_count(
                earthquake_id
            ),
            self.sgc_client.get_earthquake_felt_locations(
                earthquake_id
            ),
        )

        occurred_at = self.parse_felt_earthquake_datetime(
            summary.get("fecha")
        )

        latitude = self.safe_float(
            summary.get("latitud")
        )

        longitude = self.safe_float(
            summary.get("longitud")
        )

        # Enriquecimiento territorial con DANE.
        # Si DANE no encuentra el punto o falla temporalmente,
        # el detalle sísmico del SGC continúa funcionando.
        territory = None

        if latitude is not None and longitude is not None:
            try:
                territory_result = (
                    await self.territory_service.get_territory_at_point(
                        latitude=latitude,
                        longitude=longitude,
                    )
                )

                if (
                    territory_result.department is not None
                    or territory_result.municipality is not None
                ):
                    territory = EarthquakeTerritory(
                        department=territory_result.department,
                        municipality=territory_result.municipality,
                        reference_year=territory_result.reference_year,
                    )

            except Exception:
                territory = None

        locations = [
            self.from_sgc_felt_location(location)
            for location in felt_locations
        ]

        detail = EarthquakeDetail(
            id=str(
                summary.get("ID")
                or earthquake_id
            ),
            magnitude=self.safe_float(
                summary.get("magnitud")
            ),
            depth_km=self.safe_float(
                summary.get("profundidad")
            ),
            occurred_at=occurred_at,
            latitude=latitude,
            longitude=longitude,
            location=summary.get("sitio"),
            territory=territory,
            reports=EarthquakeReports(
                count=self.safe_int(
                    report_count.get("CONTEO")
                ) or 0,
                population_centers=self.safe_int(
                    report_count.get("NUM_CPS")
                ) or 0,
            ),
            felt_locations=locations,
        )

        return EarthquakeDetailResponse(
            source="Servicio Geológico Colombiano",
            data=detail,
        )