import asyncio

from app.schemas.location import (
    LocationContextResponse,
    LocationCoordinates,
    MiningContext,
    SeismicContext,
)
from app.services.earthquake_service import EarthquakeService
from app.services.mining_service import MiningService


class LocationService:

    def __init__(self):
        self.earthquake_service = EarthquakeService()
        self.mining_service = MiningService()

    async def get_location_context(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50,
    ) -> LocationContextResponse:
        """
        Obtiene el contexto territorial de una coordenada
        consultando SGC y ANM concurrentemente.
        """

        mining_result, seismic_result = await asyncio.gather(
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
    