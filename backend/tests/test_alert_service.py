from unittest.mock import AsyncMock

import pytest

from app.services.alert_service import AlertService


def _municipal_feature(
    *,
    object_id: int,
    probability,
    mpio_cdpmp=73001.0,
    mpio_cnmbr="IBAGUÉ",
    dpto_cnmbr="TOLIMA",
    municipio=" ",
    departamen=" ",
    cod_dane=0,
    region="ANDINA",
):
    return {
        "attributes": {
            "OBJECTID": object_id,
            "DPTO_CCDGO": 73,
            "MPIO_CCDGO": "001",
            "MPIO_CDPMP": mpio_cdpmp,
            "DPTO_CNMBR": dpto_cnmbr,
            "MPIO_CNMBR": mpio_cnmbr,
            "DEPARTAMEN": departamen,
            "MUNICIPIO": municipio,
            "COD_DANE": cod_dane,
            "REGION": region,
            "PROBABILID": probability,
        }
    }


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


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method_name", "client_method_name", "alert_type"),
    [
        (
            "get_landslide_alerts",
            "get_landslide_alerts_at_point",
            "landslide",
        ),
        (
            "get_fire_alerts",
            "get_fire_alerts_at_point",
            "fire",
        ),
    ],
)
async def test_municipal_threat_alerts_map_known_levels(
    method_name,
    client_method_name,
    alert_type,
):
    service = AlertService()
    setattr(
        service.ideam_client,
        client_method_name,
        AsyncMock(
            return_value={
                "features": [
                    _municipal_feature(
                        object_id=1,
                        probability=1,
                    ),
                    _municipal_feature(
                        object_id=2,
                        probability=2,
                    ),
                    _municipal_feature(
                        object_id=3,
                        probability=3,
                    ),
                ]
            }
        ),
    )

    result = await getattr(service, method_name)(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result.source == "IDEAM"
    assert result.has_alerts is True
    assert result.count == 3
    assert [
        alert.level
        for alert in result.alerts
    ] == [
        "yellow",
        "orange",
        "red",
    ]
    assert [
        alert.level_label
        for alert in result.alerts
    ] == [
        "AMENAZA BAJA",
        "AMENAZA MODERADA",
        "AMENAZA ALTA",
    ]
    assert result.alerts[0].type == alert_type


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method_name", "client_method_name"),
    [
        (
            "get_landslide_alerts",
            "get_landslide_alerts_at_point",
        ),
        (
            "get_fire_alerts",
            "get_fire_alerts_at_point",
        ),
    ],
)
async def test_municipal_threat_probability_zero_is_not_an_alert(
    method_name,
    client_method_name,
):
    service = AlertService()
    setattr(
        service.ideam_client,
        client_method_name,
        AsyncMock(
            return_value={
                "features": [
                    _municipal_feature(
                        object_id=968,
                        probability=0,
                        mpio_cdpmp=73001.0,
                        mpio_cnmbr="IBAGUÉ",
                        dpto_cnmbr="TOLIMA",
                        municipio=" ",
                        departamen=" ",
                        cod_dane=0,
                    )
                ]
            }
        ),
    )

    result = await getattr(service, method_name)(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result.has_alerts is False
    assert result.count == 0
    assert result.alerts == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method_name", "client_method_name"),
    [
        (
            "get_landslide_alerts",
            "get_landslide_alerts_at_point",
        ),
        (
            "get_fire_alerts",
            "get_fire_alerts_at_point",
        ),
    ],
)
async def test_municipal_threat_uses_stable_municipality_fields(
    method_name,
    client_method_name,
):
    service = AlertService()
    setattr(
        service.ideam_client,
        client_method_name,
        AsyncMock(
            return_value={
                "features": [
                    _municipal_feature(
                        object_id=418,
                        probability=3,
                        mpio_cdpmp=73001.0,
                        mpio_cnmbr="IBAGUÉ",
                        dpto_cnmbr="TOLIMA",
                        municipio=" ",
                        departamen=" ",
                        cod_dane=0,
                    )
                ]
            }
        ),
    )

    result = await getattr(service, method_name)(
        latitude=4.4389,
        longitude=-75.2322,
    )

    alert = result.alerts[0]

    assert alert.department == "TOLIMA"
    assert alert.municipality == "IBAGUÉ"
    assert alert.municipality_code == "73001"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method_name", "client_method_name"),
    [
        (
            "get_landslide_alerts",
            "get_landslide_alerts_at_point",
        ),
        (
            "get_fire_alerts",
            "get_fire_alerts_at_point",
        ),
    ],
)
async def test_municipal_threat_preserves_leading_zeros_in_codes(
    method_name,
    client_method_name,
):
    service = AlertService()
    setattr(
        service.ideam_client,
        client_method_name,
        AsyncMock(
            return_value={
                "features": [
                    _municipal_feature(
                        object_id=10,
                        probability=2,
                        mpio_cdpmp=5001.0,
                        mpio_cnmbr="MEDELLÍN",
                        dpto_cnmbr="ANTIOQUIA",
                        municipio="MEDELLÍN",
                        departamen="ANTIOQUIA",
                        cod_dane=5001,
                    )
                ]
            }
        ),
    )

    result = await getattr(service, method_name)(
        latitude=6.2442,
        longitude=-75.5812,
    )

    assert result.alerts[0].municipality_code == "05001"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method_name", "client_method_name"),
    [
        (
            "get_landslide_alerts",
            "get_landslide_alerts_at_point",
        ),
        (
            "get_fire_alerts",
            "get_fire_alerts_at_point",
        ),
    ],
)
async def test_municipal_threat_empty_features_returns_no_alerts(
    method_name,
    client_method_name,
):
    service = AlertService()
    setattr(
        service.ideam_client,
        client_method_name,
        AsyncMock(
            return_value={
                "features": [],
            }
        ),
    )

    result = await getattr(service, method_name)(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result.has_alerts is False
    assert result.count == 0
    assert result.alerts == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method_name", "client_method_name"),
    [
        (
            "get_landslide_alerts",
            "get_landslide_alerts_at_point",
        ),
        (
            "get_fire_alerts",
            "get_fire_alerts_at_point",
        ),
    ],
)
async def test_municipal_threat_unknown_probability_is_not_silent_zero(
    method_name,
    client_method_name,
):
    service = AlertService()
    setattr(
        service.ideam_client,
        client_method_name,
        AsyncMock(
            return_value={
                "features": [
                    _municipal_feature(
                        object_id=99,
                        probability=99,
                        mpio_cdpmp=73001.0,
                        mpio_cnmbr="IBAGUÉ",
                        dpto_cnmbr="TOLIMA",
                    )
                ]
            }
        ),
    )

    result = await getattr(service, method_name)(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result.has_alerts is True
    assert result.count == 1
    assert result.alerts[0].level == "unknown"
    assert result.alerts[0].level_code == 99
    assert result.alerts[0].level_label == "AMENAZA NO RECONOCIDA"
