import json
from unittest.mock import AsyncMock

import pytest

from app.core.alert_layer_config import AlertLayerConfig
from app.core.exceptions import AlertLayerError, ExternalServiceError
from app.services.alert_layer_cache import AlertLayerCache
from app.services.alert_layer_service import AlertLayerService


def _polygon_feature(
    object_id: int,
    *,
    layer: str = "hydrological",
    level: int = 2,
    name: str = "Río Coello",
) -> dict:
    if layer == "hydrological":
        properties = {
            "OBJECTID": object_id,
            "ALERTA": level,
            "NIVEL_A": "ALERTA NARANJA",
            "DEP": "TOLIMA",
            "NOMSZH": name,
            "NOMZH": "Alto Magdalena",
            "NOMAH": "Magdalena Cauca",
            "AH": 2,
            "ZH": 21,
            "SZH": 2121,
        }
    else:
        properties = {
            "OBJECTID": object_id,
            "PROBABILID": level,
            "MPIO_CNMBR": name,
            "DPTO_CNMBR": "TOLIMA",
            "COD_DANE": 73001,
            "MPIO_CDPMP": 73001,
            "DPTO_CCDGO": 73,
            "REGION": "ANDINA",
        }

    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [-75.3, 4.4],
                    [-75.2, 4.4],
                    [-75.2, 4.5],
                    [-75.3, 4.5],
                    [-75.3, 4.4],
                ]
            ],
        },
        "properties": properties,
    }


@pytest.fixture
def config() -> AlertLayerConfig:
    return AlertLayerConfig(
        max_bbox_span_deg=1.5,
        max_features=5,
        max_response_bytes=500_000,
        request_timeout_seconds=5.0,
        page_size=2,
        cache_ttl_seconds=600,
        cache_max_entries=8,
    )


@pytest.fixture
def service(config: AlertLayerConfig) -> AlertLayerService:
    client = AsyncMock()
    return AlertLayerService(
        ideam_client=client,
        config=config,
        cache=AlertLayerCache(ttl_seconds=600, max_entries=8),
    )


@pytest.mark.asyncio
async def test_builds_arcgis_filters_and_normalizes_hydro(service):
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [_polygon_feature(10, level=3)],
            "exceededTransferLimit": False,
        }
    )

    result = await service.get_layer_geojson(
        layer_type="hydrological",
        bbox="-75.40,4.30,-75.05,4.55",
        min_level=2,
    )

    assert result["type"] == "FeatureCollection"
    assert result["count"] == 1
    assert result["layer_type"] == "hydrological"
    assert result["cached"] is False

    feature = result["features"][0]
    assert feature["id"] == "hydrological-10"
    assert feature["geometry"]["type"] == "Polygon"
    assert feature["properties"]["level"] == 3
    assert feature["properties"]["level_key"] == "red"
    assert feature["properties"]["source"] == "IDEAM"
    assert feature["properties"]["name"] == "Río Coello"

    kwargs = service.ideam_client.query_layer_geojson.await_args.kwargs
    assert kwargs["where"] == "ALERTA>=2"
    assert kwargs["min_lon"] == -75.40
    assert kwargs["out_fields"]
    assert "ALERTA" in kwargs["out_fields"]


@pytest.mark.asyncio
async def test_municipal_min_level_filter(service):
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [
                _polygon_feature(
                    7,
                    layer="landslides",
                    level=2,
                    name="Ibagué",
                )
            ],
            "exceededTransferLimit": False,
        }
    )

    result = await service.get_layer_geojson(
        layer_type="landslides",
        bbox="-75.40,4.30,-75.05,4.55",
        min_level=1,
    )

    props = result["features"][0]["properties"]
    assert props["layer_type"] == "landslides"
    assert props["level_label"] == "AMENAZA MODERADA"
    assert props["municipality_code"] == "73001"

    kwargs = service.ideam_client.query_layer_geojson.await_args.kwargs
    assert kwargs["where"] == "PROBABILID>=1"


@pytest.mark.asyncio
async def test_accepts_multipolygon(service):
    feature = _polygon_feature(1)
    feature["geometry"] = {
        "type": "MultiPolygon",
        "coordinates": [
            [
                [
                    [-75.3, 4.4],
                    [-75.2, 4.4],
                    [-75.2, 4.5],
                    [-75.3, 4.5],
                    [-75.3, 4.4],
                ]
            ]
        ],
    }
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [feature],
            "exceededTransferLimit": False,
        }
    )

    result = await service.get_layer_geojson(
        layer_type="hydrological",
        bbox="-75.40,4.30,-75.05,4.55",
    )
    assert result["features"][0]["geometry"]["type"] == "MultiPolygon"


@pytest.mark.asyncio
async def test_rejects_invalid_bbox(service):
    with pytest.raises(AlertLayerError) as exc:
        await service.get_layer_geojson(
            layer_type="hydrological",
            bbox="4.3,-75.4,4.5",
        )
    assert exc.value.code == "invalid_bbox"


@pytest.mark.asyncio
async def test_rejects_bbox_too_large(service):
    with pytest.raises(AlertLayerError) as exc:
        await service.get_layer_geojson(
            layer_type="fires",
            bbox="-76.0,3.0,-74.0,5.0",
        )
    assert exc.value.code == "bbox_too_large"
    assert exc.value.status_code == 413


@pytest.mark.asyncio
async def test_unknown_layer(service):
    with pytest.raises(AlertLayerError) as exc:
        await service.get_layer_geojson(
            layer_type="volcanoes",
            bbox="-75.40,4.30,-75.05,4.55",
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_invalid_min_level(service):
    with pytest.raises(AlertLayerError) as exc:
        await service.get_layer_geojson(
            layer_type="fires",
            bbox="-75.40,4.30,-75.05,4.55",
            min_level=0,
        )
    assert exc.value.code == "invalid_min_level"


@pytest.mark.asyncio
async def test_pagination_and_deduplication(service):
    page1 = {
        "type": "FeatureCollection",
        "features": [
            _polygon_feature(1),
            _polygon_feature(2),
        ],
        "exceededTransferLimit": True,
    }
    page2 = {
        "type": "FeatureCollection",
        "features": [
            _polygon_feature(2),  # duplicate
            _polygon_feature(3),
        ],
        "exceededTransferLimit": False,
    }
    service.ideam_client.query_layer_geojson = AsyncMock(
        side_effect=[page1, page2]
    )

    result = await service.get_layer_geojson(
        layer_type="hydrological",
        bbox="-75.40,4.30,-75.05,4.55",
    )

    ids = [f["properties"]["object_id"] for f in result["features"]]
    assert ids == [1, 2, 3]
    assert service.ideam_client.query_layer_geojson.await_count == 2


@pytest.mark.asyncio
async def test_feature_limit_not_silently_truncated(service):
    service.config = AlertLayerConfig(
        max_bbox_span_deg=1.5,
        max_features=2,
        max_response_bytes=500_000,
        page_size=10,
        cache_ttl_seconds=60,
        cache_max_entries=4,
    )
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [
                _polygon_feature(1),
                _polygon_feature(2),
                _polygon_feature(3),
            ],
            "exceededTransferLimit": False,
        }
    )

    with pytest.raises(AlertLayerError) as exc:
        await service.get_layer_geojson(
            layer_type="hydrological",
            bbox="-75.40,4.30,-75.05,4.55",
        )
    assert exc.value.code == "feature_limit_exceeded"


@pytest.mark.asyncio
async def test_response_size_limit(service):
    service.config = AlertLayerConfig(
        max_bbox_span_deg=1.5,
        max_features=50,
        max_response_bytes=200,
        page_size=10,
        cache_ttl_seconds=60,
        cache_max_entries=4,
    )
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [_polygon_feature(1)],
            "exceededTransferLimit": False,
        }
    )

    with pytest.raises(AlertLayerError) as exc:
        await service.get_layer_geojson(
            layer_type="hydrological",
            bbox="-75.40,4.30,-75.05,4.55",
        )
    assert exc.value.code == "response_too_large"


@pytest.mark.asyncio
async def test_cache_hit_and_ttl_key(service):
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [_polygon_feature(1)],
            "exceededTransferLimit": False,
        }
    )

    first = await service.get_layer_geojson(
        layer_type="hydrological",
        bbox="-75.40,4.30,-75.05,4.55",
    )
    second = await service.get_layer_geojson(
        layer_type="hydrological",
        bbox="-75.40,4.30,-75.05,4.55",
    )

    assert first["cached"] is False
    assert second["cached"] is True
    assert service.ideam_client.query_layer_geojson.await_count == 1


@pytest.mark.asyncio
async def test_distinct_bboxes_do_not_share_cache(service):
    """Ventanas cercanas no deben colisionar por redondeo de clave."""
    service.ideam_client.query_layer_geojson = AsyncMock(
        side_effect=[
            {
                "type": "FeatureCollection",
                "features": [_polygon_feature(1)],
                "exceededTransferLimit": False,
            },
            {
                "type": "FeatureCollection",
                "features": [_polygon_feature(2)],
                "exceededTransferLimit": False,
            },
        ]
    )

    first = await service.get_layer_geojson(
        layer_type="hydrological",
        bbox="-75.40005,4.30005,-75.05005,4.55005",
    )
    second = await service.get_layer_geojson(
        layer_type="hydrological",
        bbox="-75.39995,4.29995,-75.04995,4.54995",
    )

    assert first["cached"] is False
    assert second["cached"] is False
    assert first["features"][0]["properties"]["object_id"] == 1
    assert second["features"][0]["properties"]["object_id"] == 2
    assert service.ideam_client.query_layer_geojson.await_count == 2


@pytest.mark.asyncio
async def test_response_size_checked_during_pagination(service):
    """El límite de bytes debe cortar antes de acumular sin cota."""
    service.config = AlertLayerConfig(
        max_bbox_span_deg=1.5,
        max_features=50,
        max_response_bytes=400,
        page_size=2,
        cache_ttl_seconds=60,
        cache_max_entries=4,
    )
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [
                _polygon_feature(1),
                _polygon_feature(2),
            ],
            "exceededTransferLimit": True,
        }
    )

    with pytest.raises(AlertLayerError) as exc:
        await service.get_layer_geojson(
            layer_type="hydrological",
            bbox="-75.40,4.30,-75.05,4.55",
        )
    assert exc.value.code == "response_too_large"


@pytest.mark.asyncio
async def test_empty_collection_is_not_provider_failure(service):
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [],
            "exceededTransferLimit": False,
        }
    )

    result = await service.get_layer_geojson(
        layer_type="fires",
        bbox="-75.40,4.30,-75.05,4.55",
    )
    assert result["count"] == 0
    assert result["features"] == []


@pytest.mark.asyncio
async def test_invalid_geometry_raises_external_error(service):
    bad = _polygon_feature(1)
    bad["geometry"] = {"type": "Point", "coordinates": [-75.2, 4.4]}
    service.ideam_client.query_layer_geojson = AsyncMock(
        return_value={
            "type": "FeatureCollection",
            "features": [bad],
            "exceededTransferLimit": False,
        }
    )

    with pytest.raises(ExternalServiceError):
        await service.get_layer_geojson(
            layer_type="hydrological",
            bbox="-75.40,4.30,-75.05,4.55",
        )


def test_cache_does_not_return_expired_entries():
    cache = AlertLayerCache(ttl_seconds=0, max_entries=2)
    cache.set("k", {"ok": True}, size_bytes=10)
    # ttl 0 => expires immediately
    assert cache.get("k") is None
