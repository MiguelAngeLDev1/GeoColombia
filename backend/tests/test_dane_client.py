import httpx
import pytest
import respx

from app.integrations.dane.client import (
    DANEClient,
    DANE_MUNICIPALITIES_URL,
)


@pytest.mark.asyncio
@respx.mock
async def test_dane_client_returns_municipality_at_point():
    respx.get(DANE_MUNICIPALITIES_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "features": [
                    {
                        "attributes": {
                            "DPTO_CCDGO": "73",
                            "MPIO_CCDGO": "168",
                            "MPIO_CDPMP": "73168",
                            "DPTO_CNMBRE": "TOLIMA",
                            "MPIO_CNMBRE": "CHAPARRAL",
                            "MPIO_TIPO": "MUNICIPIO",
                            "MPIO_NAREA": 2101.5371663,
                            "MPIO_NANO": 2024,
                        }
                    }
                ]
            },
        )
    )

    client = DANEClient()

    result = await client.get_municipality_at_point(
        latitude=3.87,
        longitude=-75.63,
    )

    assert result is not None
    assert result["DPTO_CCDGO"] == "73"
    assert result["DPTO_CNMBRE"] == "TOLIMA"
    assert result["MPIO_CDPMP"] == "73168"
    assert result["MPIO_CNMBRE"] == "CHAPARRAL"
    assert result["MPIO_TIPO"] == "MUNICIPIO"
    assert result["MPIO_NANO"] == 2024


@pytest.mark.asyncio
@respx.mock
async def test_dane_client_returns_none_when_point_has_no_municipality():
    respx.get(DANE_MUNICIPALITIES_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "features": [],
            },
        )
    )

    client = DANEClient()

    result = await client.get_municipality_at_point(
        latitude=0.0,
        longitude=-30.0,
    )

    assert result is None