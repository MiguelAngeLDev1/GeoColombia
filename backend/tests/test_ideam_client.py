from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest

from app.core.exceptions import ExternalServiceError
from app.integrations.ideam.client import IDEAMClient


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