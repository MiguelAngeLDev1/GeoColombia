from unittest.mock import AsyncMock

import pytest

from app.services.alert_service import AlertService


@pytest.mark.asyncio
async def test_get_hydrological_alerts_normalizes_ideam_payload():
    service = AlertService()

    service.ideam_client.get_hydrological_alerts_at_point = AsyncMock(
        return_value={
            "features": [
                {
                    "attributes": {
                        "OBJECTID": 50,
                        "ALERTA": 1,
                        "AH": 2,
                        "NOMAH": "Magdalena Cauca",
                        "ZH": 21,
                        "NOMZH": "Alto Magdalena",
                        "SZH": 2121,
                        "NOMSZH": "Río Coello",
                        "DEP": "TOLIMA",
                        "NIVEL_A": "ALERTA AMARILLA",
                    }
                }
            ]
        }
    )

    result = await service.get_hydrological_alerts(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result.source == "IDEAM"

    assert result.coordinates.latitude == 4.4389
    assert result.coordinates.longitude == -75.2322

    assert result.has_alerts is True
    assert result.count == 1

    alert = result.alerts[0]

    assert alert.id == 50
    assert alert.type == "hydrological"

    assert alert.level == "yellow"
    assert alert.level_code == 1
    assert alert.level_label == "ALERTA AMARILLA"

    assert alert.department == "TOLIMA"

    assert alert.hydrographic_area_code == 2
    assert alert.hydrographic_area == "Magdalena Cauca"

    assert alert.hydrographic_zone_code == 21
    assert alert.hydrographic_zone == "Alto Magdalena"

    assert alert.hydrographic_subzone_code == 2121
    assert alert.hydrographic_subzone == "Río Coello"


@pytest.mark.asyncio
async def test_get_hydrological_alerts_returns_empty_result():
    service = AlertService()

    service.ideam_client.get_hydrological_alerts_at_point = AsyncMock(
        return_value={
            "features": [],
        }
    )

    result = await service.get_hydrological_alerts(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result.source == "IDEAM"
    assert result.has_alerts is False
    assert result.count == 0
    assert result.alerts == []


@pytest.mark.asyncio
async def test_get_hydrological_alerts_maps_all_known_levels():
    service = AlertService()

    service.ideam_client.get_hydrological_alerts_at_point = AsyncMock(
        return_value={
            "features": [
                {
                    "attributes": {
                        "OBJECTID": 1,
                        "ALERTA": 1,
                        "NIVEL_A": "ALERTA AMARILLA",
                    }
                },
                {
                    "attributes": {
                        "OBJECTID": 2,
                        "ALERTA": 2,
                        "NIVEL_A": "ALERTA NARANJA",
                    }
                },
                {
                    "attributes": {
                        "OBJECTID": 3,
                        "ALERTA": 3,
                        "NIVEL_A": "ALERTA ROJA",
                    }
                },
            ]
        }
    )

    result = await service.get_hydrological_alerts(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result.count == 3

    assert [
        alert.level
        for alert in result.alerts
    ] == [
        "yellow",
        "orange",
        "red",
    ]


@pytest.mark.asyncio
async def test_get_hydrological_alerts_maps_unknown_level():
    service = AlertService()

    service.ideam_client.get_hydrological_alerts_at_point = AsyncMock(
        return_value={
            "features": [
                {
                    "attributes": {
                        "OBJECTID": 99,
                        "ALERTA": 99,
                        "NIVEL_A": "NIVEL DESCONOCIDO",
                    }
                }
            ]
        }
    )

    result = await service.get_hydrological_alerts(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result.count == 1
    assert result.alerts[0].level == "unknown"
    assert result.alerts[0].level_code == 99