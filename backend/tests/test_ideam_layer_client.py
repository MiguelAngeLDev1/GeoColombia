from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest

from app.core.exceptions import ExternalServiceError
from app.integrations.ideam.client import (
    IDEAM_HYDROLOGICAL_ALERTS_URL,
    IDEAMClient,
)


@pytest.mark.asyncio
async def test_query_layer_geojson_sends_expected_params():
    payload = {
        "type": "FeatureCollection",
        "features": [],
    }
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ) as mocked_get:
        result = await IDEAMClient().query_layer_geojson(
            url=IDEAM_HYDROLOGICAL_ALERTS_URL,
            min_lon=-75.4,
            min_lat=4.3,
            max_lon=-75.05,
            max_lat=4.55,
            where="ALERTA>=1",
            out_fields="OBJECTID,ALERTA",
            result_offset=0,
            result_record_count=50,
            timeout_seconds=12.0,
        )

    assert result == payload
    args, kwargs = mocked_get.await_args
    called_url = kwargs.get("url", args[0] if args else None)
    assert called_url == IDEAM_HYDROLOGICAL_ALERTS_URL
    params = kwargs["params"]
    assert params["geometryType"] == "esriGeometryEnvelope"
    assert params["geometry"] == "-75.4,4.3,-75.05,4.55"
    assert params["inSR"] == "4326"
    assert params["outSR"] == "4326"
    assert params["spatialRel"] == "esriSpatialRelIntersects"
    assert params["returnGeometry"] == "true"
    assert params["f"] == "geojson"
    assert params["where"] == "ALERTA>=1"
    assert params["orderByFields"] == "OBJECTID ASC"
    assert params["resultOffset"] == 0
    assert params["resultRecordCount"] == 50


@pytest.mark.asyncio
async def test_query_layer_geojson_timeout():
    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(side_effect=httpx.TimeoutException("t")),
    ):
        with pytest.raises(ExternalServiceError) as exc:
            await IDEAMClient().query_layer_geojson(
                url=IDEAM_HYDROLOGICAL_ALERTS_URL,
                min_lon=-75.4,
                min_lat=4.3,
                max_lon=-75.05,
                max_lat=4.55,
                where="ALERTA>=1",
                out_fields="OBJECTID,ALERTA",
            )
    assert "tiempo de espera" in exc.value.message


@pytest.mark.asyncio
async def test_query_national_layer_geojson_sends_offset_and_out_sr():
    payload = {
        "type": "FeatureCollection",
        "features": [],
    }
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ) as mocked_get:
        result = await IDEAMClient().query_national_layer_geojson(
            url=IDEAM_HYDROLOGICAL_ALERTS_URL,
            where="ALERTA>=1",
            out_fields="OBJECTID,ALERTA,NIVEL_A,NOMSZH,DEP",
            max_allowable_offset=0.05,
            result_offset=0,
            result_record_count=200,
            timeout_seconds=30.0,
        )

    assert result == payload
    params = mocked_get.await_args.kwargs["params"]
    assert params["outSR"] == "4326"
    assert params["f"] == "geojson"
    assert params["returnGeometry"] == "true"
    assert params["where"] == "ALERTA>=1"
    assert params["maxAllowableOffset"] == 0.05
    assert params["orderByFields"] == "OBJECTID ASC"
    assert params["resultRecordCount"] == 200
    assert "geometry" not in params
    assert "geometryPrecision" not in params


@pytest.mark.asyncio
async def test_query_national_layer_geojson_timeout():
    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(side_effect=httpx.TimeoutException("t")),
    ):
        with pytest.raises(ExternalServiceError) as exc:
            await IDEAMClient().query_national_layer_geojson(
                url=IDEAM_HYDROLOGICAL_ALERTS_URL,
                where="ALERTA>=1",
                out_fields="OBJECTID,ALERTA",
                max_allowable_offset=0.05,
            )
    assert "tiempo de espera" in exc.value.message


@pytest.mark.asyncio
async def test_query_national_layer_geojson_arcgis_error():
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"error": {"message": "fail"}}

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ):
        with pytest.raises(ExternalServiceError) as exc:
            await IDEAMClient().query_national_layer_geojson(
                url=IDEAM_HYDROLOGICAL_ALERTS_URL,
                where="ALERTA>=1",
                out_fields="OBJECTID,ALERTA",
                max_allowable_offset=0.05,
            )
    assert "nacional" in exc.value.message.lower()


@pytest.mark.asyncio
async def test_point_query_still_uses_default_timeout_path():
    payload = {"features": []}
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload

    with patch(
        "app.integrations.ideam.client.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ):
        result = await IDEAMClient().get_hydrological_alerts_at_point(
            latitude=4.4,
            longitude=-75.2,
        )

    assert result == payload
