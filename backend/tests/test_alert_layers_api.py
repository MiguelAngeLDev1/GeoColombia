from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.core.exceptions import AlertLayerError, ExternalServiceError
from app.main import app


client = TestClient(app)


def test_layers_endpoint_returns_geojson():
    payload = {
        "type": "FeatureCollection",
        "features": [],
        "source": "IDEAM",
        "layer_type": "hydrological",
        "bbox": [-75.4, 4.3, -75.05, 4.55],
        "min_level": 1,
        "count": 0,
        "cached": False,
    }

    with patch(
        "app.api.alerts.alert_layer_service.get_layer_geojson",
        new=AsyncMock(return_value=payload),
    ) as mocked:
        response = client.get(
            "/api/v1/alerts/layers/hydrological",
            params={
                "bbox": "-75.40,4.30,-75.05,4.55",
                "min_level": 1,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert body["count"] == 0
    mocked.assert_awaited_once()


def test_layers_endpoint_maps_validation_error():
    with patch(
        "app.api.alerts.alert_layer_service.get_layer_geojson",
        new=AsyncMock(
            side_effect=AlertLayerError(
                "Acerque el mapa",
                code="bbox_too_large",
                status_code=413,
            )
        ),
    ):
        response = client.get(
            "/api/v1/alerts/layers/landslides",
            params={"bbox": "-76,3,-74,5", "min_level": 1},
        )

    assert response.status_code == 413
    assert response.json()["error"] == "bbox_too_large"


def test_layers_endpoint_maps_external_error():
    with patch(
        "app.api.alerts.alert_layer_service.get_layer_geojson",
        new=AsyncMock(
            side_effect=ExternalServiceError(
                service="IDEAM",
                message="timeout",
            )
        ),
    ):
        response = client.get(
            "/api/v1/alerts/layers/fires",
            params={
                "bbox": "-75.40,4.30,-75.05,4.55",
                "min_level": 1,
            },
        )

    assert response.status_code == 502
    assert response.json()["service"] == "IDEAM"


def test_national_layers_endpoint_returns_geojson():
    payload = {
        "type": "FeatureCollection",
        "features": [],
        "source": "IDEAM",
        "layer_type": "hydrological",
        "mode": "national",
        "min_level": 1,
        "max_allowable_offset": 0.05,
        "max_allowable_offset_unit": "degrees_wgs84",
        "count": 0,
        "cached": False,
    }

    with patch(
        "app.api.alerts.alert_layer_service.get_national_layer_geojson",
        new=AsyncMock(return_value=payload),
    ) as mocked:
        response = client.get(
            "/api/v1/alerts/layers/hydrological/national",
            params={"min_level": 1},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "national"
    assert body["type"] == "FeatureCollection"
    mocked.assert_awaited_once()


def test_national_layers_endpoint_maps_errors():
    with patch(
        "app.api.alerts.alert_layer_service.get_national_layer_geojson",
        new=AsyncMock(
            side_effect=AlertLayerError(
                "demasiadas entidades",
                code="feature_limit_exceeded",
                status_code=413,
            )
        ),
    ):
        response = client.get("/api/v1/alerts/layers/landslides/national")

    assert response.status_code == 413
    assert response.json()["error"] == "feature_limit_exceeded"


def test_national_and_regional_routes_coexist():
    paths = set(app.openapi()["paths"])
    assert "/api/v1/alerts/layers/{layer_type}" in paths
    assert "/api/v1/alerts/layers/{layer_type}/national" in paths

    # regional sin bbox sigue exigiendo el query param
    regional = client.get("/api/v1/alerts/layers/fires")
    assert regional.status_code == 422

    # /national no se interpreta como layer_type="…/national"
    with patch(
        "app.api.alerts.alert_layer_service.get_national_layer_geojson",
        new=AsyncMock(
            return_value={
                "type": "FeatureCollection",
                "features": [],
                "mode": "national",
                "count": 0,
                "cached": False,
            }
        ),
    ):
        national = client.get("/api/v1/alerts/layers/fires/national")
    assert national.status_code == 200


def test_point_endpoints_still_registered():
    paths = set(app.openapi()["paths"])
    assert "/api/v1/alerts/hydrological" in paths
    assert "/api/v1/alerts/layers/{layer_type}" in paths
    assert "/api/v1/alerts/layers/{layer_type}/national" in paths
    assert "/api/v1/location/context" in paths
