from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest

from app.core.exceptions import ExternalServiceError
from app.integrations.ideam.client import (
    IDEAMClient,
    IDEAM_FIRE_ALERTS_URL,
    IDEAM_LANDSLIDE_ALERTS_URL,
    IDEAM_MUNICIPAL_THREAT_FIELDS,
)


@pytest.mark.asyncio
async def test_get_hydrological_alerts_at_point_returns_payload():
    payload = {
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
                    "DEP_1": "TOLIMA",
                    "DEP_2": " ",
                    "NIVEL_A": "ALERTA AMARILLA",
                }
            }
        ]
    }

    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ):
        result = await IDEAMClient().get_hydrological_alerts_at_point(
            latitude=4.4389,
            longitude=-75.2322,
        )

    assert result == payload


@pytest.mark.asyncio
async def test_get_hydrological_alerts_at_point_raises_external_service_error():
    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(
            side_effect=httpx.RequestError(
                "IDEAM unavailable",
            )
        ),
    ):
        with pytest.raises(ExternalServiceError) as exc_info:
            await IDEAMClient().get_hydrological_alerts_at_point(
                latitude=4.4389,
                longitude=-75.2322,
            )

    assert exc_info.value.service == "IDEAM"


@pytest.mark.asyncio
async def test_get_hydrological_alerts_at_point_handles_arcgis_error():
    payload = {
        "error": {
            "code": 500,
            "message": "Unable to complete operation.",
        }
    }

    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ):
        with pytest.raises(ExternalServiceError) as exc_info:
            await IDEAMClient().get_hydrological_alerts_at_point(
                latitude=4.4389,
                longitude=-75.2322,
            )

    assert exc_info.value.service == "IDEAM"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method_name", "expected_url"),
    [
        (
            "get_landslide_alerts_at_point",
            IDEAM_LANDSLIDE_ALERTS_URL,
        ),
        (
            "get_fire_alerts_at_point",
            IDEAM_FIRE_ALERTS_URL,
        ),
    ],
)
async def test_municipal_threat_methods_use_expected_url_and_params(
    method_name,
    expected_url,
):
    payload = {"features": []}
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload
    mock_get = AsyncMock(return_value=response)

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=mock_get,
    ):
        method = getattr(IDEAMClient(), method_name)
        result = await method(
            latitude=4.4389,
            longitude=-75.2322,
        )

    assert result == payload
    assert mock_get.await_count == 1

    called_url = mock_get.await_args.args[0]
    called_params = mock_get.await_args.kwargs["params"]

    assert called_url == expected_url
    assert called_params["geometry"] == "-75.2322,4.4389"
    assert called_params["geometryType"] == "esriGeometryPoint"
    assert called_params["inSR"] == "4326"
    assert called_params["spatialRel"] == "esriSpatialRelIntersects"
    assert called_params["where"] == "1=1"
    assert called_params["outFields"] == IDEAM_MUNICIPAL_THREAT_FIELDS
    assert called_params["returnGeometry"] == "false"
    assert called_params["f"] == "json"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method_name",
    [
        "get_landslide_alerts_at_point",
        "get_fire_alerts_at_point",
    ],
)
async def test_municipal_threat_methods_raise_on_http_error(
    method_name,
):
    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(
            side_effect=httpx.RequestError("IDEAM unavailable")
        ),
    ):
        method = getattr(IDEAMClient(), method_name)

        with pytest.raises(ExternalServiceError) as exc_info:
            await method(
                latitude=4.4389,
                longitude=-75.2322,
            )

    assert exc_info.value.service == "IDEAM"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method_name",
    [
        "get_landslide_alerts_at_point",
        "get_fire_alerts_at_point",
    ],
)
async def test_municipal_threat_methods_raise_on_invalid_json(
    method_name,
):
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.side_effect = ValueError("invalid json")

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ):
        method = getattr(IDEAMClient(), method_name)

        with pytest.raises(ExternalServiceError) as exc_info:
            await method(
                latitude=4.4389,
                longitude=-75.2322,
            )

    assert exc_info.value.service == "IDEAM"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method_name",
    [
        "get_landslide_alerts_at_point",
        "get_fire_alerts_at_point",
    ],
)
async def test_municipal_threat_methods_raise_on_arcgis_error(
    method_name,
):
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {
        "error": {
            "code": 500,
            "message": "Unable to complete operation.",
        }
    }

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ):
        method = getattr(IDEAMClient(), method_name)

        with pytest.raises(ExternalServiceError) as exc_info:
            await method(
                latitude=4.4389,
                longitude=-75.2322,
            )

    assert exc_info.value.service == "IDEAM"
