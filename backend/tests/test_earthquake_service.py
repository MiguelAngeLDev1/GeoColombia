from datetime import datetime, timezone

import pytest

from app.services.earthquake_service import EarthquakeService


def test_from_sgc_feature_normalizes_earthquake():
    feature = {
        "attributes": {
            "ESP_ID_EVENTO_TXT": 7310,
            "ESP_MAGNITUD": 3.8544,
            "ESP_PROFUNDIDAD": 200,
            "ESP_FECHA_LONG": 922965362000,
            "ESP_LATITUD": -1.48,
            "ESP_LONGITUD": -77.5858,
            "MUN_CODIGO": None,
            "DEPT_CODIGO": None,
        }
    }

    result = EarthquakeService.from_sgc_feature(feature)

    assert result.id == 7310
    assert result.magnitude == 3.8544
    assert result.depth_km == 200
    assert result.occurred_at == datetime(
        1999,
        4,
        1,
        11,
        16,
        2,
        tzinfo=timezone.utc,
    )
    assert result.latitude == -1.48
    assert result.longitude == -77.5858
    assert result.municipality_code is None
    assert result.department_code is None


def test_calculate_distance_km():
    distance = EarthquakeService.calculate_distance_km(
        latitude1=4.4389,
        longitude1=-75.2322,
        latitude2=4.5364,
        longitude2=-75.2496,
    )

    assert distance == pytest.approx(
        11.0,
        abs=0.5,
    )


def test_timestamp_ms_to_datetime_supports_negative_timestamp():
    result = EarthquakeService.timestamp_ms_to_datetime(
        -106631218000
    )

    assert result is not None
    assert result.year < 1970
    assert result.tzinfo == timezone.utc


@pytest.mark.asyncio
async def test_get_nearby_earthquakes_orders_by_distance(
    monkeypatch,
):
    service = EarthquakeService()

    async def mock_get_earthquakes_near_point(
        latitude: float,
        longitude: float,
        radius_km: float,
    ):
        return [
            {
                "attributes": {
                    "ESP_ID_EVENTO_TXT": 1,
                    "ESP_MAGNITUD": 4.0,
                    "ESP_PROFUNDIDAD": 10.0,
                    "ESP_FECHA_LONG": 1501411241000,
                    "ESP_LATITUD": 4.70,
                    "ESP_LONGITUD": -75.50,
                    "MUN_CODIGO": "73001",
                    "DEPT_CODIGO": "73",
                }
            },
            {
                "attributes": {
                    "ESP_ID_EVENTO_TXT": 2,
                    "ESP_MAGNITUD": 3.5,
                    "ESP_PROFUNDIDAD": 5.0,
                    "ESP_FECHA_LONG": 1501411241000,
                    "ESP_LATITUD": 4.45,
                    "ESP_LONGITUD": -75.24,
                    "MUN_CODIGO": "73001",
                    "DEPT_CODIGO": "73",
                }
            },
        ]

    monkeypatch.setattr(
        service.sgc_client,
        "get_earthquakes_near_point",
        mock_get_earthquakes_near_point,
    )

    result = await service.get_nearby_earthquakes(
        latitude=4.4389,
        longitude=-75.2322,
        radius_km=50,
    )

    # Metadata de la consulta
    assert result.source == "Servicio Geológico Colombiano"
    assert result.center.latitude == 4.4389
    assert result.center.longitude == -75.2322
    assert result.radius_km == 50
    assert result.count == 2

    # Eventos
    assert len(result.data) == 2

    # El evento 2 debe estar primero porque está más cerca.
    assert result.data[0].id == 2
    assert result.data[1].id == 1

    assert result.data[0].distance_km is not None
    assert result.data[1].distance_km is not None

    assert (
        result.data[0].distance_km
        < result.data[1].distance_km
    )