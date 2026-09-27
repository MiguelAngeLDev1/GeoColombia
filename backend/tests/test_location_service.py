import pytest

from app.schemas.earthquake import (
    Coordinates,
    Earthquake,
    NearbyEarthquakeResponse,
)
from app.schemas.mining import (
    MiningTitle,
    MiningTitleListResponse,
)
from app.services.location_service import LocationService


@pytest.mark.asyncio
async def test_get_location_context_combines_mining_and_seismic_data(
    monkeypatch,
):
    service = LocationService()

    async def mock_get_titles_at_point(
        latitude: float,
        longitude: float,
    ):
        return MiningTitleListResponse(
            source="Agencia Nacional de Minería",
            coordinates={
                "latitude": latitude,
                "longitude": longitude,
            },
            count=1,
            data=[
                MiningTitle(
                    code="TDG-08281",
                    area_ha=1173.6383,
                    registration_date=None,
                    status="Activo",
                    modality="CONTRATO DE CONCESIÓN (L 685)",
                    stage="Exploración",
                    minerals="CARBÓN",
                    departments="Norte de Santander",
                    municipalities="SARDINATA",
                )
            ],
        )

    async def mock_get_nearby_earthquakes(
        latitude: float,
        longitude: float,
        radius_km: float,
    ):
        return NearbyEarthquakeResponse(
            source="Servicio Geológico Colombiano",
            center=Coordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            radius_km=radius_km,
            count=1,
            data=[
                Earthquake(
                    id=24051,
                    magnitude=4.0,
                    depth_km=10.0,
                    occurred_at=None,
                    latitude=8.40,
                    longitude=-72.90,
                    municipality_code=None,
                    department_code=None,
                    distance_km=5.0,
                )
            ],
        )

    monkeypatch.setattr(
        service.mining_service,
        "get_titles_at_point",
        mock_get_titles_at_point,
    )

    monkeypatch.setattr(
        service.earthquake_service,
        "get_nearby_earthquakes",
        mock_get_nearby_earthquakes,
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    # Coordenada consultada
    assert result.location.latitude == 8.3665
    assert result.location.longitude == -72.86

    # Contexto minero
    assert result.mining.has_titles is True
    assert result.mining.count == 1
    assert len(result.mining.titles) == 1

    mining_title = result.mining.titles[0]

    assert mining_title.code == "TDG-08281"
    assert mining_title.status == "Activo"
    assert mining_title.stage == "Exploración"
    assert mining_title.minerals == "CARBÓN"
    assert mining_title.departments == "Norte de Santander"
    assert mining_title.municipalities == "SARDINATA"

    # Contexto sísmico
    assert result.seismic.radius_km == 50
    assert result.seismic.count == 1
    assert len(result.seismic.earthquakes) == 1

    earthquake = result.seismic.earthquakes[0]

    assert earthquake.id == 24051
    assert earthquake.distance_km == 5.0