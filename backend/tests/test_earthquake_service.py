from datetime import datetime, timezone

import pytest

from app.services.earthquake_service import EarthquakeService
from app.schemas.earthquake import RecentEarthquake


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


def test_from_sgc_recent_event_normalizes_earthquake():
    event = {
        "ID_SISMO": "SGC2026taucow",
        "SITIO": "Chaparral - Tolima, Colombia",
        "FECHA": "27/09/2026 - 07:57 AM",
        "MAGNITUD": 3.8,
        "PROFUNDIDAD": 16,
        "LATITUD": 3.84,
        "LONGITUD": -75.64,
        "I_MAX": 4,
        "TIME_VALUE": 1790513836,
    }

    earthquake = EarthquakeService.from_sgc_recent_event(event)

    assert earthquake.id == "SGC2026taucow"
    assert earthquake.magnitude == 3.8
    assert earthquake.depth_km == 16
    assert earthquake.latitude == 3.84
    assert earthquake.longitude == -75.64
    assert earthquake.location == "Chaparral - Tolima, Colombia"
    assert earthquake.max_intensity == 4
    assert earthquake.occurred_at is not None


@pytest.mark.asyncio
async def test_get_recent_earthquakes_orders_and_limits(monkeypatch):
    service = EarthquakeService()

    async def mock_get_recent_earthquakes():
        return [
            {
                "ID_SISMO": "SGC2026OLDER",
                "SITIO": "Evento anterior",
                "MAGNITUD": 2.5,
                "PROFUNDIDAD": 10,
                "LATITUD": 4.0,
                "LONGITUD": -75.0,
                "I_MAX": 2,
                "TIME_VALUE": 1790000000,
            },
            {
                "ID_SISMO": "SGC2026NEWER",
                "SITIO": "Evento reciente",
                "MAGNITUD": 3.8,
                "PROFUNDIDAD": 16,
                "LATITUD": 3.84,
                "LONGITUD": -75.64,
                "I_MAX": 4,
                "TIME_VALUE": 1790513836,
            },
        ]

    monkeypatch.setattr(
        service.sgc_client,
        "get_recent_earthquakes",
        mock_get_recent_earthquakes,
    )

    result = await service.get_recent_earthquakes(
        limit=1,
    )

    assert result.count == 1
    assert len(result.data) == 1
    assert result.data[0].id == "SGC2026NEWER"    


@pytest.mark.asyncio
async def test_get_latest_earthquake_returns_most_recent(monkeypatch):
    service = EarthquakeService()

    async def mock_get_recent_earthquakes():
        return [
            {
                "ID_SISMO": "SGC2026OLDER",
                "SITIO": "Evento anterior",
                "MAGNITUD": 2.5,
                "PROFUNDIDAD": 10,
                "LATITUD": 4.0,
                "LONGITUD": -75.0,
                "I_MAX": 2,
                "TIME_VALUE": 1790000000,
            },
            {
                "ID_SISMO": "SGC2026LATEST",
                "SITIO": "Evento más reciente",
                "MAGNITUD": 3.1,
                "PROFUNDIDAD": 16,
                "LATITUD": 3.84,
                "LONGITUD": -75.64,
                "I_MAX": 5,
                "TIME_VALUE": 1790550216,
            },
        ]

    monkeypatch.setattr(
        service.sgc_client,
        "get_recent_earthquakes",
        mock_get_recent_earthquakes,
    )

    result = await service.get_latest_earthquake()

    assert result.data is not None
    assert result.data.id == "SGC2026LATEST"
    assert result.data.magnitude == 3.1
    assert result.data.max_intensity == 5

@pytest.mark.asyncio
async def test_get_earthquake_detail_combines_sgc_data(
    monkeypatch,
):
    service = EarthquakeService()

    earthquake_id = "SGC2026tbskuv"

    async def mock_get_earthquake_summary(
        earthquake_id: str,
    ):
        return {
            "fecha": "27/09/2026 20:10:59",
            "latitud": "3.23",
            "longitud": "-75.88",
            "sitio": "Rioblanco - Tolima, Colombia",
            "profundidad": "5",
            "magnitud": 2.8,
            "fecha_formato2": "2026/09/27 08:10:59 PM",
            "ID": earthquake_id,
        }

    async def mock_get_earthquake_report_count(
        earthquake_id: str,
    ):
        return {
            "NUM_CPS": "3",
            "CONTEO": 5,
        }

    async def mock_get_earthquake_felt_locations(
        earthquake_id: str,
    ):
        return [
            {
                "ID_CENTRO_POBLADO": 73555001,
                "DIST": 16.38,
                "COD_MUNICIPIO": 73555,
                "COD_CENTRO_POBLADO": 73555001,
                "INT_RED": 2,
                "LONGITUD": -75.75,
                "MUNICIPIO": "PLANADAS, TOLIMA",
                "CONTEO": 3,
                "NOMBRE_CENTRO_POBLADO": "BILBAO",
                "LATITUD": 3.28,
            }
        ]

    monkeypatch.setattr(
        service.sgc_client,
        "get_earthquake_summary",
        mock_get_earthquake_summary,
    )

    monkeypatch.setattr(
        service.sgc_client,
        "get_earthquake_report_count",
        mock_get_earthquake_report_count,
    )

    monkeypatch.setattr(
        service.sgc_client,
        "get_earthquake_felt_locations",
        mock_get_earthquake_felt_locations,
    )

    result = await service.get_earthquake_detail(
        earthquake_id
    )

    assert result.source == "Servicio Geológico Colombiano"

    detail = result.data

    assert detail.id == earthquake_id
    assert detail.magnitude == 2.8
    assert detail.depth_km == 5.0
    assert detail.latitude == 3.23
    assert detail.longitude == -75.88
    assert detail.location == "Rioblanco - Tolima, Colombia"

    assert detail.occurred_at is not None
    assert detail.occurred_at.year == 2026
    assert detail.occurred_at.month == 9
    assert detail.occurred_at.day == 27
    assert detail.occurred_at.hour == 20
    assert detail.occurred_at.minute == 10
    assert detail.occurred_at.second == 59

    assert detail.reports.count == 5
    assert detail.reports.population_centers == 3

    assert len(detail.felt_locations) == 1

    felt_location = detail.felt_locations[0]

    assert felt_location.municipality == "PLANADAS, TOLIMA"
    assert felt_location.population_center == "BILBAO"
    assert felt_location.municipality_code == 73555
    assert felt_location.population_center_code == 73555001
    assert felt_location.distance_km == 16.38
    assert felt_location.intensity == 2
    assert felt_location.reports == 3
    assert felt_location.latitude == 3.28
    assert felt_location.longitude == -75.75