import httpx
import pytest
import respx

from app.core.exceptions import ExternalServiceError
from app.integrations.anm.client import (
    ANMClient,
    ANM_MINING_TITLES_URL,
)


@pytest.mark.asyncio
@respx.mock
async def test_anm_client_returns_mining_titles():
    respx.get(ANM_MINING_TITLES_URL).mock(
        return_value=httpx.Response(
            status_code=200,
            json={
                "features": [
                    {
                        "attributes": {
                            "CODIGO_EXPEDIENTE": "TDG-08281",
                            "AREA_HA": 1173.6383,
                            "ESTADO": "Activo",
                            "MINERALES": "CARBÓN",
                        }
                    }
                ]
            },
        )
    )

    client = ANMClient()

    result = await client.get_mining_titles_at_point(
        latitude=8.3665,
        longitude=-72.86,
    )

    assert len(result) == 1

    attributes = result[0]["attributes"]

    assert attributes["CODIGO_EXPEDIENTE"] == "TDG-08281"
    assert attributes["ESTADO"] == "Activo"
    assert attributes["MINERALES"] == "CARBÓN"


@pytest.mark.asyncio
@respx.mock
async def test_anm_client_handles_http_error():
    respx.get(ANM_MINING_TITLES_URL).mock(
        return_value=httpx.Response(
            status_code=500,
        )
    )

    client = ANMClient()

    with pytest.raises(ExternalServiceError) as exc_info:
        await client.get_mining_titles_at_point(
            latitude=8.3665,
            longitude=-72.86,
        )

    assert exc_info.value.service == "ANM"
    assert exc_info.value.message == "ANM returned HTTP 500"


@pytest.mark.asyncio
@respx.mock
async def test_anm_client_handles_timeout():
    respx.get(ANM_MINING_TITLES_URL).mock(
        side_effect=httpx.ReadTimeout(
            "ANM timeout"
        )
    )

    client = ANMClient()

    with pytest.raises(ExternalServiceError) as exc_info:
        await client.get_mining_titles_at_point(
            latitude=8.3665,
            longitude=-72.86,
        )

    assert exc_info.value.service == "ANM"
    assert exc_info.value.message == "ANM request timed out"


@pytest.mark.asyncio
@respx.mock
async def test_anm_client_handles_arcgis_error():
    respx.get(ANM_MINING_TITLES_URL).mock(
        return_value=httpx.Response(
            status_code=200,
            json={
                "error": {
                    "code": 400,
                    "message": "Invalid query",
                }
            },
        )
    )

    client = ANMClient()

    with pytest.raises(ExternalServiceError) as exc_info:
        await client.get_mining_titles_at_point(
            latitude=8.3665,
            longitude=-72.86,
        )

    assert exc_info.value.service == "ANM"
    assert exc_info.value.message == "Invalid query"