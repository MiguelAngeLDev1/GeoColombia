import asyncio

from app.schemas.location import (
    LocationContextResponse,
    LocationCoordinates,
    MiningContext,
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
    ) -> LocationContextResponse:
        """
        Obtiene el contexto de una coordenada consultando
        DANE, ANM y SGC concurrentemente.
        """

        (
            territory_result,
            mining_result,
            seismic_result,
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
        )

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
                earthquakes=seismic_result.data,
            ),
        )