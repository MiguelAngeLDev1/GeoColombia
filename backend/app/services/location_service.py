import asyncio
from datetime import datetime, timezone

from app.schemas.location import (
    LocationContextResponse,
    LocationCoordinates,
    MiningContext,
    RecentSeismicContext,
    SeismicContext,
    TerritoryContext,
)
from app.services.earthquake_service import EarthquakeService
from app.services.mining_service import MiningService
from app.services.territory_service import TerritoryService


class LocationService:

    def __init__(self):
        self.earthquake_service = EarthquakeService()
        self.mining_service = MiningService()
        self.territory_service = TerritoryService()

    async def get_location_context(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50,
        earthquake_limit: int = 10,
        recent_earthquake_limit: int = 5,
    ) -> LocationContextResponse:
        """
        Obtiene el contexto de una coordenada consultando
        DANE, ANM y SGC concurrentemente.

        Incluye:
        - Contexto territorial.
        - Títulos mineros.
        - Sismicidad histórica cercana.
        - Sismicidad reciente cercana.
        """

        (
            territory_result,
            mining_result,
            seismic_result,
            recent_seismic_result,
        ) = await asyncio.gather(
            self.territory_service.get_territory_at_point(
                latitude=latitude,
                longitude=longitude,
            ),
            self.mining_service.get_titles_at_point(
                latitude=latitude,
                longitude=longitude,
            ),
            self.earthquake_service.get_nearby_earthquakes(
                latitude=latitude,
                longitude=longitude,
                radius_km=radius_km,
            ),
            self.earthquake_service.get_recent_earthquakes(
                limit=100,
            ),
        )

        # Sismicidad histórica.
        earthquakes = seismic_result.data[:earthquake_limit]

        # Sismicidad reciente dentro del radio solicitado.
        recent_nearby = []

        for earthquake in recent_seismic_result.data:
            if (
                earthquake.latitude is None
                or earthquake.longitude is None
            ):
                continue

            distance_km = (
                self.earthquake_service.calculate_distance_km(
                    latitude,
                    longitude,
                    earthquake.latitude,
                    earthquake.longitude,
                )
            )

            if distance_km <= radius_km:
                earthquake.distance_km = round(
                    distance_km,
                    2,
                )

                recent_nearby.append(
                    (
                        distance_km,
                        earthquake,
                    )
                )

        # Los eventos recientes se muestran del más nuevo
        # al más antiguo.
        recent_nearby.sort(
            key=lambda item: (
                item[1].occurred_at
                if item[1].occurred_at is not None
                else datetime.min.replace(
                    tzinfo=timezone.utc
                )
            ),
            reverse=True,
        )

        # Total de eventos recientes encontrados dentro
        # del radio antes de aplicar el límite de respuesta.
        recent_count = len(recent_nearby)

        recent_earthquakes = [
            earthquake
            for _, earthquake in recent_nearby[
                :recent_earthquake_limit
            ]
        ]

        return LocationContextResponse(
            location=LocationCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            territory=TerritoryContext(
                department=territory_result.department,
                municipality=territory_result.municipality,
                reference_year=territory_result.reference_year,
            ),
            mining=MiningContext(
                has_titles=mining_result.count > 0,
                count=mining_result.count,
                titles=mining_result.data,
            ),
            seismic=SeismicContext(
                radius_km=seismic_result.radius_km,
                count=seismic_result.count,
                returned=len(earthquakes),
                earthquakes=earthquakes,
                recent=RecentSeismicContext(
                    count=recent_count,
                    returned=len(recent_earthquakes),
                    earthquakes=recent_earthquakes,
                ),
            ),
        )