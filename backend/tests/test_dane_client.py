import json

import httpx
import pytest
import respx

from app.core.exceptions import ExternalServiceError
from app.integrations.dane.client import (
    DANEClient,
    DANE_MUNICIPALITIES_URL,
    DANE_MUNICIPALITY_FIELDS,
)


def assert_dane_query_params(request, latitude: float, longitude: float):
    assert "MapServer/317/query" in str(request.url)
    assert "FeatureServer" not in str(request.url)

    params = request.url.params

    geometry = json.loads(params["geometry"])

    assert geometry["x"] == longitude
    assert geometry["y"] == latitude
    assert geometry["spatialReference"]["wkid"] == 4326

    assert params["geometryType"] == "esriGeometryPoint"
    assert params["inSR"] == "4326"
    assert params["spatialRel"] == "esriSpatialRelIntersects"
    assert params["where"] == "1=1"
    assert params["outFields"] == DANE_MUNICIPALITY_FIELDS
    assert params["returnGeometry"] == "false"
    assert params["f"] == "json"
    assert "resultRecordCount" not in params


@pytest.mark.asyncio
@respx.mock
async def test_dane_client_returns_municipality_at_point():
    route = respx.get(DANE_MUNICIPALITIES_URL).mock(
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

    assert route.called
    assert_dane_query_params(
        route.calls.last.request,
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
    route = respx.get(DANE_MUNICIPALITIES_URL).mock(
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

    assert route.called
    assert_dane_query_params(
        route.calls.last.request,
        latitude=0.0,
        longitude=-30.0,
    )

    assert result is None


@pytest.mark.asyncio
@respx.mock
async def test_dane_client_raises_external_service_error_on_arcgis_error():
    respx.get(DANE_MUNICIPALITIES_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "error": {
                    "code": 500,
                    "message": "Error performing query operation",
                    "details": [],
                }
            },
        )
    )

    client = DANEClient()

    with pytest.raises(ExternalServiceError) as exc_info:
        await client.get_municipality_at_point(
            latitude=4.4389,
            longitude=-75.2322,
        )

    assert exc_info.value.service == "DANE"
    assert exc_info.value.message == "Error performing query operation"


@pytest.mark.asyncio
async def test_dane_municipalities_url_uses_mapserver():
    assert (
        DANE_MUNICIPALITIES_URL
        == (
            "https://geoportal.dane.gov.co/mparcgis/rest/services/"
            "MGN2025/Serv_CapasMGN_2025/MapServer/317/query"
        )
    )
    assert "FeatureServer" not in DANE_MUNICIPALITIES_URL
