import httpx
import pytest

from app.core.exceptions import ExternalServiceError
from app.integrations.weather.client import WeatherClient


@pytest.mark.asyncio
async def test_get_forecast_returns_weather_payload(monkeypatch):
    payload = {
        "latitude": 4.44,
        "longitude": -75.23,
        "timezone": "America/Bogota",
        "current": {
            "temperature_2m": 24.5,
            "apparent_temperature": 25.2,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 2,
        },
        "hourly": {
            "time": ["2026-10-04T21:00"],
            "precipitation_probability": [40],
        },
        "daily": {
            "time": ["2026-10-04"],
            "temperature_2m_max": [27.0],
            "temperature_2m_min": [18.0],
        },
    }

    async def mock_get(self, url, params=None):
        request = httpx.Request(
            "GET",
            url,
            params=params,
        )

        return httpx.Response(
            status_code=200,
            json=payload,
            request=request,
        )

    monkeypatch.setattr(
        httpx.AsyncClient,
        "get",
        mock_get,
    )

    client = WeatherClient()

    result = await client.get_forecast(
        latitude=4.4389,
        longitude=-75.2322,
    )

    assert result == payload
    assert result["current"]["temperature_2m"] == 24.5
    assert result["timezone"] == "America/Bogota"


@pytest.mark.asyncio
async def test_get_forecast_raises_external_service_error(
    monkeypatch,
):
    async def mock_get(self, url, params=None):
        request = httpx.Request(
            "GET",
            url,
            params=params,
        )

        return httpx.Response(
            status_code=500,
            request=request,
        )

    monkeypatch.setattr(
        httpx.AsyncClient,
        "get",
        mock_get,
    )

    client = WeatherClient()

    with pytest.raises(ExternalServiceError) as exc_info:
        await client.get_forecast(
            latitude=4.4389,
            longitude=-75.2322,
        )

    assert exc_info.value.service == "Open-Meteo"