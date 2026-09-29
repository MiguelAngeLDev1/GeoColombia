import pytest

from app.services.territory_service import TerritoryService


@pytest.mark.asyncio
async def test_get_territory_at_point_normalizes_dane_data(
    monkeypatch,
):
    service = TerritoryService()

    async def mock_get_municipality_at_point(
        latitude: float,
        longitude: float,
    ):
        return {
            "DPTO_CCDGO": "73",
            "MPIO_CCDGO": "168",
            "MPIO_CDPMP": "73168",
            "DPTO_CNMBRE": "TOLIMA",
            "MPIO_CNMBRE": "CHAPARRAL",
            "MPIO_TIPO": "MUNICIPIO",
            "MPIO_NAREA": 2101.5371663,
            "MPIO_NANO": 2024,
        }

    monkeypatch.setattr(
        service.dane_client,
        "get_municipality_at_point",
        mock_get_municipality_at_point,
    )

    result = await service.get_territory_at_point(
        latitude=3.87,
        longitude=-75.63,
    )

    assert result.source == "DANE - Marco Geoestadístico Nacional"

    assert result.coordinates.latitude == 3.87
    assert result.coordinates.longitude == -75.63

    assert result.department is not None
    assert result.department.code == "73"
    assert result.department.name == "Tolima"

    assert result.municipality is not None
    assert result.municipality.code == "73168"
    assert result.municipality.name == "Chaparral"
    assert result.municipality.type == "Municipio"
    assert result.municipality.area_km2 == 2101.5371663

    assert result.reference_year == 2024


@pytest.mark.asyncio
async def test_get_territory_at_point_handles_point_outside_colombia(
    monkeypatch,
):
    service = TerritoryService()

    async def mock_get_municipality_at_point(
        latitude: float,
        longitude: float,
    ):
        return None

    monkeypatch.setattr(
        service.dane_client,
        "get_municipality_at_point",
        mock_get_municipality_at_point,
    )

    result = await service.get_territory_at_point(
        latitude=0.0,
        longitude=-30.0,
    )

    assert result.coordinates.latitude == 0.0
    assert result.coordinates.longitude == -30.0

    assert result.department is None
    assert result.municipality is None
    assert result.reference_year is None