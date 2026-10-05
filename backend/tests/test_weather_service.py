import pytest

from app.services.weather_service import WeatherService


@pytest.mark.asyncio
async def test_get_weather_normalizes_open_meteo_payload(
    monkeypatch,
):
    service = WeatherService()

    payload = {
        "latitude": 4.44,
        "longitude": -75.23,
        "timezone": "America/Bogota",
        "current": {
            "time": "2026-10-04T21:00",
            "temperature_2m": 21.6,
            "apparent_temperature": 24.0,
            "relative_humidity_2m": 76,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 3,
            "cloud_cover": 95,
            "surface_pressure": 880.5,
            "wind_speed_10m": 1.2,
            "wind_direction_10m": 297,
            "wind_gusts_10m": 5.4,
        },
        "hourly": {
            "time": [
                "2026-10-04T20:00",
                "2026-10-04T21:00",
                "2026-10-04T22:00",
                "2026-10-04T23:00",
            ],
            "temperature_2m": [
                22.0,
                21.6,
                21.1,
                20.8,
            ],
            "apparent_temperature": [
                24.2,
                24.0,
                23.5,
                23.1,
            ],
            "precipitation_probability": [
                10,
                20,
                60,
                80,
            ],
            "precipitation": [
                0.0,
                0.0,
                0.3,
                1.0,
            ],
            "rain": [
                0.0,
                0.0,
                0.3,
                1.0,
            ],
            "weather_code": [
                2,
                3,
                51,
                61,
            ],
            "cloud_cover": [
                80,
                95,
                98,
                100,
            ],
            "wind_speed_10m": [
                2.0,
                1.2,
                2.5,
                3.0,
            ],
        },
        "daily": {
            "time": [
                "2026-10-04",
                "2026-10-05",
            ],
            "weather_code": [
                51,
                53,
            ],
            "temperature_2m_max": [
                26.6,
                28.6,
            ],
            "temperature_2m_min": [
                18.0,
                17.9,
            ],
            "apparent_temperature_max": [
                30.6,
                32.3,
            ],
            "apparent_temperature_min": [
                18.6,
                18.2,
            ],
            "precipitation_sum": [
                0.3,
                2.5,
            ],
            "rain_sum": [
                0.2,
                1.4,
            ],
            "precipitation_probability_max": [
                49,
                87,
            ],
            "wind_speed_10m_max": [
                9.7,
                8.9,
            ],
            "wind_gusts_10m_max": [
                29.5,
                26.6,
            ],
            "uv_index_max": [
                9.15,
                7.75,
            ],
            "sunrise": [
                "2026-10-04T05:47",
                "2026-10-05T05:47",
            ],
            "sunset": [
                "2026-10-04T17:51",
                "2026-10-05T17:50",
            ],
        },
    }

    async def mock_get_forecast(
        latitude,
        longitude,
        forecast_days=7,
    ):
        return payload

    monkeypatch.setattr(
        service.weather_client,
        "get_forecast",
        mock_get_forecast,
    )

    result = await service.get_weather(
        latitude=4.4389,
        longitude=-75.2322,
        hourly_limit=2,
    )

    assert result.source == "Open-Meteo"
    assert result.timezone == "America/Bogota"

    assert result.current.temperature_c == 21.6
    assert result.current.feels_like_c == 24.0
    assert result.current.humidity_percent == 76
    assert result.current.is_raining is False
    assert result.current.condition == "Overcast"

    assert len(result.hourly) == 2

    assert (
        result.hourly[0].time.hour
        == 21
    )

    assert (
        result.hourly[0]
        .precipitation_probability_percent
        == 20
    )

    assert result.hourly[1].time.hour == 22
    assert result.hourly[1].condition == "Light drizzle"

    assert len(result.daily) == 2
    assert result.daily[0].temperature_max_c == 26.6
    assert (
        result.daily[1]
        .precipitation_probability_max_percent
        == 87
    )


def test_get_condition_translates_wmo_codes():
    service = WeatherService()

    assert service.get_condition(0) == "Clear sky"
    assert service.get_condition(3) == "Overcast"
    assert service.get_condition(51) == "Light drizzle"
    assert service.get_condition(61) == "Slight rain"
    assert service.get_condition(95) == "Thunderstorm"
    assert service.get_condition(None) is None

@pytest.mark.asyncio
async def test_get_weather_starts_hourly_forecast_after_current_time(
    monkeypatch,
):
    service = WeatherService()

    payload = {
        "latitude": 4.44,
        "longitude": -75.23,
        "timezone": "America/Bogota",
        "current": {
            "time": "2026-10-04T21:30",
            "temperature_2m": 21.5,
            "apparent_temperature": 23.6,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 3,
        },
        "hourly": {
            "time": [
                "2026-10-04T20:00",
                "2026-10-04T21:00",
                "2026-10-04T22:00",
                "2026-10-04T23:00",
                "2026-10-05T00:00",
            ],
            "temperature_2m": [
                22.0,
                21.8,
                21.2,
                20.9,
                20.5,
            ],
            "weather_code": [
                2,
                3,
                3,
                51,
                61,
            ],
        },
        "daily": {
            "time": [],
        },
    }

    async def mock_get_forecast(
        latitude,
        longitude,
        forecast_days=7,
    ):
        return payload

    monkeypatch.setattr(
        service.weather_client,
        "get_forecast",
        mock_get_forecast,
    )

    result = await service.get_weather(
        latitude=4.4389,
        longitude=-75.2322,
        hourly_limit=2,
    )

    assert len(result.hourly) == 2
    assert result.hourly[0].time.hour == 22
    assert result.hourly[1].time.hour == 23@pytest.mark.asyncio

@pytest.mark.asyncio
async def test_get_weather_starts_hourly_forecast_after_current_time(
    monkeypatch,
):
    service = WeatherService()

    payload = {
        "latitude": 4.44,
        "longitude": -75.23,
        "timezone": "America/Bogota",
        "current": {
            "time": "2026-10-04T21:30",
            "temperature_2m": 21.5,
            "apparent_temperature": 23.6,
            "relative_humidity_2m": 75,
            "precipitation": 0.0,
            "rain": 0.0,
            "weather_code": 3,
        },
        "hourly": {
            "time": [
                "2026-10-04T20:00",
                "2026-10-04T21:00",
                "2026-10-04T22:00",
                "2026-10-04T23:00",
                "2026-10-05T00:00",
            ],
            "temperature_2m": [
                22.0,
                21.8,
                21.2,
                20.9,
                20.5,
            ],
            "weather_code": [
                2,
                3,
                3,
                51,
                61,
            ],
        },
        "daily": {
            "time": [],
        },
    }

    async def mock_get_forecast(
        latitude,
        longitude,
        forecast_days=7,
    ):
        return payload

    monkeypatch.setattr(
        service.weather_client,
        "get_forecast",
        mock_get_forecast,
    )

    result = await service.get_weather(
        latitude=4.4389,
        longitude=-75.2322,
        hourly_limit=2,
    )

    assert len(result.hourly) == 2
    assert result.hourly[0].time.hour == 22
    assert result.hourly[1].time.hour == 23