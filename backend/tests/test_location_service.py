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
from app.schemas.territory import (
    Department,
    Municipality,
    TerritoryCoordinates,
    TerritoryResponse,
)
from app.services.location_service import LocationService


@pytest.mark.asyncio
async def test_get_location_context_combines_territory_mining_and_seismic_data(
    monkeypatch,
):
    service = LocationService()

    async def mock_get_territory_at_point(
        latitude: float,
        longitude: float,
    ):
        return TerritoryResponse(
            source="DANE - Marco Geoestadístico Nacional",
            coordinates=TerritoryCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            department=Department(
                code="54",
                name="Norte De Santander",
            ),
            municipality=Municipality(
                code="54720",
                name="Sardinata",
                type="Municipio",
                area_km2=1451.17,
            ),
            reference_year=2024,
        )

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
        service.territory_service,
        "get_territory_at_point",
        mock_get_territory_at_point,
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

    # Contexto territorial
    assert result.territory.department is not None
    assert result.territory.department.code == "54"
    assert result.territory.department.name == "Norte De Santander"

    assert result.territory.municipality is not None
    assert result.territory.municipality.code == "54720"
    assert result.territory.municipality.name == "Sardinata"
    assert result.territory.municipality.type == "Municipio"
    assert result.territory.municipality.area_km2 == 1451.17

    assert result.territory.reference_year == 2024

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


@pytest.mark.asyncio
async def test_get_location_context_limits_returned_earthquakes(
    monkeypatch,
):
    service = LocationService()

    async def mock_get_territory_at_point(
        latitude: float,
        longitude: float,
    ):
        from app.schemas.territory import (
            Department,
            Municipality,
            TerritoryResponse,
        )

        return TerritoryResponse(
            source="DANE - Marco Geoestadístico Nacional",
            coordinates={
                "latitude": latitude,
                "longitude": longitude,
            },
            department=Department(
                code="73",
                name="Tolima",
            ),
            municipality=Municipality(
                code="73168",
                name="Chaparral",
                type="Municipio",
                area_km2=2101.53,
            ),
            reference_year=2024,
        )

    async def mock_get_titles_at_point(
        latitude: float,
        longitude: float,
    ):
        from app.schemas.mining import MiningTitleListResponse

        return MiningTitleListResponse(
            source="Agencia Nacional de Minería",
            coordinates={
                "latitude": latitude,
                "longitude": longitude,
            },
            count=0,
            data=[],
        )

    async def mock_get_nearby_earthquakes(
        latitude: float,
        longitude: float,
        radius_km: float,
    ):
        from app.schemas.earthquake import (
            Coordinates,
            Earthquake,
            NearbyEarthquakeResponse,
        )

        earthquakes = [
            Earthquake(
                id=index,
                magnitude=3.0,
                depth_km=10.0,
                occurred_at=None,
                latitude=latitude,
                longitude=longitude,
                municipality_code="73168",
                department_code="73",
                distance_km=float(index),
            )
            for index in range(1, 21)
        ]

        return NearbyEarthquakeResponse(
            source="Servicio Geológico Colombiano",
            center=Coordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            radius_km=radius_km,
            count=20,
            data=earthquakes,
        )

    monkeypatch.setattr(
        service.territory_service,
        "get_territory_at_point",
        mock_get_territory_at_point,
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
        latitude=3.87,
        longitude=-75.63,
        radius_km=50,
        earthquake_limit=5,
    )

    assert result.seismic.count == 20
    assert result.seismic.returned == 5
    assert len(result.seismic.earthquakes) == 5