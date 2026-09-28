import httpx
import pytest
import respx

from app.core.exceptions import ExternalServiceError
from app.integrations.sgc.client import (
    SGCClient,
    SGC_FELT_EARTHQUAKES_BASE_URL,
)


RECENT_EARTHQUAKES_URL = (
    f"{SGC_FELT_EARTHQUAKES_BASE_URL}/"
    "resumenSismosConIntensidadBatch/-1"
)


@pytest.mark.asyncio
@respx.mock
async def test_sgc_client_returns_recent_earthquakes():
    respx.get(RECENT_EARTHQUAKES_URL).mock(
        return_value=httpx.Response(
            200,
            json=[
                {
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
            ],
        )
    )

    client = SGCClient()

    result = await client.get_recent_earthquakes()

    assert len(result) == 1

    event = result[0]

    assert event["ID_SISMO"] == "SGC2026taucow"
    assert event["MAGNITUD"] == 3.8
    assert event["PROFUNDIDAD"] == 16
    assert event["LATITUD"] == 3.84
    assert event["LONGITUD"] == -75.64
    assert event["I_MAX"] == 4


@pytest.mark.asyncio
@respx.mock
async def test_sgc_client_recent_earthquakes_handles_http_error():
    respx.get(RECENT_EARTHQUAKES_URL).mock(
        return_value=httpx.Response(
            500,
            json={"message": "Internal Server Error"},
        )
    )

    client = SGCClient()

    with pytest.raises(ExternalServiceError):
        await client.get_recent_earthquakes()


@pytest.mark.asyncio
@respx.mock
async def test_sgc_client_recent_earthquakes_handles_timeout():
    respx.get(RECENT_EARTHQUAKES_URL).mock(
        side_effect=httpx.ReadTimeout(
            "Request timed out",
        )
    )

    client = SGCClient()

    with pytest.raises(ExternalServiceError):
        await client.get_recent_earthquakes()


@pytest.mark.asyncio
@respx.mock
async def test_sgc_client_recent_earthquakes_handles_invalid_response():
    respx.get(RECENT_EARTHQUAKES_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "unexpected": "response",
            },
        )
    )

    client = SGCClient()

    with pytest.raises(ExternalServiceError):
        await client.get_recent_earthquakes()