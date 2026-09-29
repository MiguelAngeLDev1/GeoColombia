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


@pytest.mark.asyncio
@respx.mock
async def test_get_earthquake_summary():
    earthquake_id = "SGC2026tbskuv"

    route = respx.get(
        f"{SGC_FELT_EARTHQUAKES_BASE_URL}/"
        f"resumenSismo/{earthquake_id}"
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "fecha": "27/09/2026 20:10:59",
                "latitud": "3.23",
                "longitud": "-75.88",
                "sitio": "Rioblanco - Tolima, Colombia",
                "profundidad": "5",
                "magnitud": 2.8,
                "fecha_formato2": "2026/09/27 08:10:59 PM",
                "ID": earthquake_id,
            },
        )
    )

    client = SGCClient()

    result = await client.get_earthquake_summary(
        earthquake_id
    )

    assert route.called
    assert result["ID"] == earthquake_id
    assert result["magnitud"] == 2.8
    assert result["profundidad"] == "5"
    assert result["latitud"] == "3.23"
    assert result["longitud"] == "-75.88"
    assert result["sitio"] == "Rioblanco - Tolima, Colombia"


@pytest.mark.asyncio
@respx.mock
async def test_get_earthquake_report_count():
    earthquake_id = "SGC2026tbskuv"

    route = respx.get(
        f"{SGC_FELT_EARTHQUAKES_BASE_URL}/"
        f"conteoReportes/{earthquake_id}"
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "NUM_CPS": "3",
                "CONTEO": 5,
            },
        )
    )

    client = SGCClient()

    result = await client.get_earthquake_report_count(
        earthquake_id
    )

    assert route.called
    assert result["NUM_CPS"] == "3"
    assert result["CONTEO"] == 5


@pytest.mark.asyncio
@respx.mock
async def test_get_earthquake_felt_locations():
    earthquake_id = "SGC2026tbskuv"

    route = respx.get(
        f"{SGC_FELT_EARTHQUAKES_BASE_URL}/"
        f"tabla/{earthquake_id}"
    ).mock(
        return_value=httpx.Response(
            200,
            json=[
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
                },
                {
                    "ID_CENTRO_POBLADO": 76275000,
                    "DIST": 40.99,
                    "COD_MUNICIPIO": 76275,
                    "COD_CENTRO_POBLADO": 76275000,
                    "INT_RED": 2,
                    "LONGITUD": -76.23,
                    "MUNICIPIO": "FLORIDA, VALLE DEL CAUCA",
                    "CONTEO": 1,
                    "NOMBRE_CENTRO_POBLADO": "FLORIDA",
                    "LATITUD": 3.32,
                },
            ],
        )
    )

    client = SGCClient()

    result = await client.get_earthquake_felt_locations(
        earthquake_id
    )

    assert route.called
    assert len(result) == 2

    first_location = result[0]

    assert first_location["MUNICIPIO"] == "PLANADAS, TOLIMA"
    assert first_location["NOMBRE_CENTRO_POBLADO"] == "BILBAO"
    assert first_location["INT_RED"] == 2
    assert first_location["CONTEO"] == 3
    assert first_location["DIST"] == 16.38