from datetime import datetime, timezone

import pytest

from app.core.exceptions import ExternalServiceError
from app.schemas.alerts import (
    AlertCoordinates,
    HydrologicalAlert,
    HydrologicalAlertsResponse,
)
from app.schemas.earthquake import (
    Coordinates,
    Earthquake,
    NearbyEarthquakeResponse,
    RecentEarthquake,
    RecentEarthquakeListResponse,
)
from app.schemas.mining import (
    MiningTitle,
    MiningTitleListResponse,
)
from app.schemas.territory import (
    Department,
    Municipality,
    TerritoryCoordinates,
    TerritoryResponse,
)
from app.schemas.weather import (
    CurrentWeather,
    DailyWeather,
    HourlyWeather,
    WeatherCoordinates,
    WeatherResponse,
)
from app.services.location_service import LocationService


async def _default_territory(latitude: float, longitude: float):
    return TerritoryResponse(
        source="DANE - Marco Geoestadístico Nacional",
        coordinates=TerritoryCoordinates(
            latitude=latitude,
            longitude=longitude,
        ),
        department=Department(
            code="54",
            name="Norte De Santander",
        ),
        municipality=Municipality(
            code="54720",
            name="Sardinata",
            type="Municipio",
            area_km2=1451.17,
        ),
        reference_year=2024,
    )


async def _default_mining(latitude: float, longitude: float):
    return MiningTitleListResponse(
        source="Agencia Nacional de Minería",
        coordinates={
            "latitude": latitude,
            "longitude": longitude,
        },
        count=1,
        data=[
            MiningTitle(
                code="TDG-08281",
                area_ha=1173.6383,
                registration_date=None,
                status="Activo",
                modality="CONTRATO DE CONCESIÓN (L 685)",
                stage="Exploración",
                minerals="CARBÓN",
                departments="Norte de Santander",
                municipalities="SARDINATA",
            )
        ],
    )


async def _empty_mining(latitude: float, longitude: float):
    return MiningTitleListResponse(
        source="Agencia Nacional de Minería",
        coordinates={
            "latitude": latitude,
            "longitude": longitude,
        },
        count=0,
        data=[],
    )


async def _default_nearby(
    latitude: float,
    longitude: float,
    radius_km: float,
):
    return NearbyEarthquakeResponse(
        source="Servicio Geológico Colombiano",
        center=Coordinates(
            latitude=latitude,
            longitude=longitude,
        ),
        radius_km=radius_km,
        count=1,
        data=[
            Earthquake(
                id=24051,
                magnitude=4.0,
                depth_km=10.0,
                occurred_at=None,
                latitude=8.40,
                longitude=-72.90,
                municipality_code=None,
                department_code=None,
                distance_km=5.0,
            )
        ],
    )


async def _default_recent(limit: int = 20):
    return RecentEarthquakeListResponse(
        source="Servicio Geológico Colombiano",
        count=1,
        data=[
            RecentEarthquake(
                id="SGC2026test001",
                magnitude=3.2,
                depth_km=12.0,
                occurred_at=datetime(
                    2026,
                    9,
                    29,
                    3,
                    24,
                    5,
                    tzinfo=timezone.utc,
                ),
                latitude=8.37,
                longitude=-72.86,
                location=(
                    "Sardinata - Norte de Santander, Colombia"
                ),
                max_intensity=3,
            )
        ],
    )


async def _default_weather(
    latitude: float,
    longitude: float,
    forecast_days: int = 7,
    hourly_limit: int = 24,
):
    return WeatherResponse(
        source="Open-Meteo",
        timezone="America/Bogota",
        coordinates=WeatherCoordinates(
            latitude=latitude,
            longitude=longitude,
        ),
        current=CurrentWeather(
            observed_at="2026-10-04T21:30",
            temperature_c=21.5,
            feels_like_c=23.6,
            humidity_percent=75,
            precipitation_mm=0.0,
            rain_mm=0.0,
            is_raining=False,
            weather_code=3,
            condition="Overcast",
            cloud_cover_percent=91,
            pressure_hpa=880.8,
            wind_speed_kmh=1.5,
            wind_direction_deg=306,
            wind_gusts_kmh=6.5,
        ),
        hourly=[
            HourlyWeather(
                time="2026-10-04T22:00",
                temperature_c=21.2,
                feels_like_c=23.1,
                precipitation_probability_percent=20,
                precipitation_mm=0.0,
                rain_mm=0.0,
                weather_code=3,
                condition="Overcast",
                cloud_cover_percent=88,
                wind_speed_kmh=2.2,
            ),
            HourlyWeather(
                time="2026-10-04T23:00",
                temperature_c=20.4,
                feels_like_c=21.7,
                precipitation_probability_percent=28,
                precipitation_mm=0.0,
                rain_mm=0.0,
                weather_code=3,
                condition="Overcast",
                cloud_cover_percent=95,
                wind_speed_kmh=3.1,
            ),
        ],
        daily=[
            DailyWeather(
                date="2026-10-04",
                weather_code=51,
                condition="Light drizzle",
                temperature_max_c=26.6,
                temperature_min_c=18.0,
                feels_like_max_c=30.6,
                feels_like_min_c=18.6,
                precipitation_sum_mm=0.3,
                rain_sum_mm=0.2,
                precipitation_probability_max_percent=49,
                wind_speed_max_kmh=9.7,
                wind_gusts_max_kmh=29.5,
                uv_index_max=9.15,
                sunrise="2026-10-04T05:47",
                sunset="2026-10-04T17:51",
            ),
        ],
    )


async def _default_alerts(latitude: float, longitude: float):
    return HydrologicalAlertsResponse(
        source="IDEAM",
        coordinates=AlertCoordinates(
            latitude=latitude,
            longitude=longitude,
        ),
        has_alerts=True,
        count=1,
        alerts=[
            HydrologicalAlert(
                id=50,
                level="yellow",
                level_code=1,
                level_label="ALERTA AMARILLA",
                department="NORTE DE SANTANDER",
                hydrographic_area_code=1,
                hydrographic_area="Caribe",
                hydrographic_zone_code=16,
                hydrographic_zone="Catatumbo",
                hydrographic_subzone_code=1605,
                hydrographic_subzone="Río Sardinata",
            )
        ],
    )


async def _empty_alerts(latitude: float, longitude: float):
    return HydrologicalAlertsResponse(
        source="IDEAM",
        coordinates=AlertCoordinates(
            latitude=latitude,
            longitude=longitude,
        ),
        has_alerts=False,
        count=0,
        alerts=[],
    )


def _fail(service: str, message: str):
    async def _raiser(*args, **kwargs):
        raise ExternalServiceError(
            service=service,
            message=message,
        )

    return _raiser


def patch_providers(
    monkeypatch,
    service: LocationService,
    *,
    territory=None,
    mining=None,
    nearby=None,
    recent=None,
    weather=None,
    alerts=None,
):
    monkeypatch.setattr(
        service.territory_service,
        "get_territory_at_point",
        territory or _default_territory,
    )
    monkeypatch.setattr(
        service.mining_service,
        "get_titles_at_point",
        mining or _default_mining,
    )
    monkeypatch.setattr(
        service.earthquake_service,
        "get_nearby_earthquakes",
        nearby or _default_nearby,
    )
    monkeypatch.setattr(
        service.earthquake_service,
        "get_recent_earthquakes",
        recent or _default_recent,
    )
    monkeypatch.setattr(
        service.weather_service,
        "get_weather",
        weather or _default_weather,
    )
    monkeypatch.setattr(
        service.alert_service,
        "get_hydrological_alerts",
        alerts or _default_alerts,
    )


def assert_unavailable(
    result,
    *,
    service: str,
    component: str,
):
    matches = [
        item
        for item in result.unavailable_sources
        if item.service == service
        and item.component == component
    ]

    assert len(matches) == 1
    assert matches[0].message


@pytest.mark.asyncio
async def test_get_location_context_combines_all_sources(
    monkeypatch,
):
    service = LocationService()
    patch_providers(monkeypatch, service)

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.location.latitude == 8.3665
    assert result.location.longitude == -72.86
    assert result.unavailable_sources == []

    assert result.territory is not None
    assert result.territory.department is not None
    assert result.territory.department.code == "54"
    assert (
        result.territory.department.name
        == "Norte De Santander"
    )

    assert result.territory.municipality is not None
    assert result.territory.municipality.code == "54720"
    assert result.territory.municipality.name == "Sardinata"
    assert result.territory.municipality.type == "Municipio"
    assert (
        result.territory.municipality.area_km2
        == 1451.17
    )
    assert result.territory.reference_year == 2024

    assert result.weather is not None
    assert result.weather.source == "Open-Meteo"
    assert result.weather.timezone == "America/Bogota"
    assert result.weather.current.temperature_c == 21.5
    assert result.weather.current.feels_like_c == 23.6
    assert result.weather.current.humidity_percent == 75
    assert result.weather.current.is_raining is False
    assert result.weather.current.condition == "Overcast"
    assert result.weather.current.wind_speed_kmh == 1.5

    assert result.weather.today is not None
    assert result.weather.today.temperature_min_c == 18.0
    assert result.weather.today.temperature_max_c == 26.6
    assert (
        result.weather.today
        .precipitation_probability_max_percent
        == 49
    )
    assert (
        result.weather.today.precipitation_sum_mm
        == 0.3
    )
    assert result.weather.today.uv_index_max == 9.15

    assert len(result.weather.next_hours) == 2
    assert result.weather.next_hours[0].time.hour == 22
    assert (
        result.weather.next_hours[0].temperature_c
        == 21.2
    )
    assert (
        result.weather.next_hours[0]
        .precipitation_probability_percent
        == 20
    )

    assert result.alerts is not None
    assert result.alerts.source == "IDEAM"
    assert result.alerts.hydrological.has_alerts is True
    assert result.alerts.hydrological.count == 1
    assert len(result.alerts.hydrological.alerts) == 1

    hydrological_alert = (
        result.alerts.hydrological.alerts[0]
    )

    assert hydrological_alert.id == 50
    assert hydrological_alert.type == "hydrological"
    assert hydrological_alert.level == "yellow"
    assert hydrological_alert.level_code == 1
    assert (
        hydrological_alert.level_label
        == "ALERTA AMARILLA"
    )
    assert (
        hydrological_alert.department
        == "NORTE DE SANTANDER"
    )
    assert (
        hydrological_alert.hydrographic_area
        == "Caribe"
    )
    assert (
        hydrological_alert.hydrographic_zone
        == "Catatumbo"
    )
    assert (
        hydrological_alert.hydrographic_subzone
        == "Río Sardinata"
    )

    assert result.mining is not None
    assert result.mining.has_titles is True
    assert result.mining.count == 1
    assert len(result.mining.titles) == 1

    mining_title = result.mining.titles[0]

    assert mining_title.code == "TDG-08281"
    assert mining_title.status == "Activo"
    assert mining_title.stage == "Exploración"
    assert mining_title.minerals == "CARBÓN"
    assert (
        mining_title.departments
        == "Norte de Santander"
    )
    assert mining_title.municipalities == "SARDINATA"

    assert result.seismic is not None
    assert result.seismic.radius_km == 50
    assert result.seismic.count == 1
    assert result.seismic.returned == 1
    assert len(result.seismic.earthquakes) == 1

    earthquake = result.seismic.earthquakes[0]

    assert earthquake.id == 24051
    assert earthquake.distance_km == 5.0

    assert result.seismic.recent.count == 1
    assert result.seismic.recent.returned == 1
    assert len(result.seismic.recent.earthquakes) == 1

    recent_earthquake = (
        result.seismic.recent.earthquakes[0]
    )

    assert recent_earthquake.id == "SGC2026test001"
    assert recent_earthquake.magnitude == 3.2
    assert recent_earthquake.distance_km is not None
    assert recent_earthquake.distance_km <= 50
    assert recent_earthquake.distance_km == round(
        recent_earthquake.distance_km,
        2,
    )


@pytest.mark.asyncio
async def test_get_location_context_limits_returned_earthquakes(
    monkeypatch,
):
    service = LocationService()

    async def mock_get_nearby_earthquakes(
        latitude: float,
        longitude: float,
        radius_km: float,
    ):
        earthquakes = [
            Earthquake(
                id=index,
                magnitude=3.0,
                depth_km=10.0,
                occurred_at=None,
                latitude=latitude,
                longitude=longitude,
                municipality_code="73168",
                department_code="73",
                distance_km=float(index),
            )
            for index in range(1, 21)
        ]

        return NearbyEarthquakeResponse(
            source="Servicio Geológico Colombiano",
            center=Coordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            radius_km=radius_km,
            count=20,
            data=earthquakes,
        )

    async def mock_get_recent_earthquakes(
        limit: int = 20,
    ):
        earthquakes = [
            RecentEarthquake(
                id=f"SGC2026test{index:03d}",
                magnitude=3.0,
                depth_km=10.0,
                occurred_at=datetime(
                    2026,
                    9,
                    29,
                    index,
                    0,
                    0,
                    tzinfo=timezone.utc,
                ),
                latitude=3.87,
                longitude=-75.63,
                location="Chaparral - Tolima, Colombia",
                max_intensity=3,
            )
            for index in range(1, 11)
        ]

        return RecentEarthquakeListResponse(
            source="Servicio Geológico Colombiano",
            count=10,
            data=earthquakes,
        )

    async def mock_get_weather(
        latitude: float,
        longitude: float,
        forecast_days: int = 7,
        hourly_limit: int = 24,
    ):
        return WeatherResponse(
            source="Open-Meteo",
            timezone="America/Bogota",
            coordinates=WeatherCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            current=CurrentWeather(
                observed_at="2026-10-04T21:30",
                temperature_c=21.5,
                feels_like_c=23.6,
                humidity_percent=75,
                precipitation_mm=0.0,
                rain_mm=0.0,
                is_raining=False,
                weather_code=3,
                condition="Overcast",
                cloud_cover_percent=91,
                pressure_hpa=880.8,
                wind_speed_kmh=1.5,
                wind_direction_deg=306,
                wind_gusts_kmh=6.5,
            ),
            hourly=[],
            daily=[],
        )

    async def mock_get_territory_at_point(
        latitude: float,
        longitude: float,
    ):
        return TerritoryResponse(
            source="DANE - Marco Geoestadístico Nacional",
            coordinates=TerritoryCoordinates(
                latitude=latitude,
                longitude=longitude,
            ),
            department=Department(
                code="73",
                name="Tolima",
            ),
            municipality=Municipality(
                code="73168",
                name="Chaparral",
                type="Municipio",
                area_km2=2101.53,
            ),
            reference_year=2024,
        )

    patch_providers(
        monkeypatch,
        service,
        territory=mock_get_territory_at_point,
        mining=_empty_mining,
        nearby=mock_get_nearby_earthquakes,
        recent=mock_get_recent_earthquakes,
        weather=mock_get_weather,
        alerts=_empty_alerts,
    )

    result = await service.get_location_context(
        latitude=3.87,
        longitude=-75.63,
        radius_km=50,
        earthquake_limit=5,
        recent_earthquake_limit=3,
    )

    assert result.unavailable_sources == []

    assert result.seismic is not None
    assert result.seismic.count == 20
    assert result.seismic.returned == 5
    assert len(result.seismic.earthquakes) == 5

    assert result.seismic.recent.count == 10
    assert result.seismic.recent.returned == 3
    assert len(result.seismic.recent.earthquakes) == 3

    assert (
        result.seismic.recent.earthquakes[0].id
        == "SGC2026test010"
    )
    assert (
        result.seismic.recent.earthquakes[1].id
        == "SGC2026test009"
    )
    assert (
        result.seismic.recent.earthquakes[2].id
        == "SGC2026test008"
    )

    for earthquake in result.seismic.recent.earthquakes:
        assert earthquake.distance_km is not None
        assert earthquake.distance_km <= 50
        assert earthquake.distance_km == round(
            earthquake.distance_km,
            2,
        )

    assert result.weather is not None
    assert result.weather.source == "Open-Meteo"
    assert result.weather.current.temperature_c == 21.5
    assert result.weather.today is None
    assert result.weather.next_hours == []

    assert result.alerts is not None
    assert result.alerts.source == "IDEAM"
    assert result.alerts.hydrological.has_alerts is False
    assert result.alerts.hydrological.count == 0
    assert result.alerts.hydrological.alerts == []


@pytest.mark.asyncio
async def test_get_location_context_dane_failure_is_partial(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        territory=_fail("DANE", "DANE unavailable"),
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.territory is None
    assert result.weather is not None
    assert result.alerts is not None
    assert result.mining is not None
    assert result.seismic is not None
    assert len(result.unavailable_sources) == 1
    assert_unavailable(
        result,
        service="DANE",
        component="territory",
    )


@pytest.mark.asyncio
async def test_get_location_context_anm_failure_is_partial(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        mining=_fail("ANM", "ANM unavailable"),
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.mining is None
    assert result.territory is not None
    assert result.weather is not None
    assert result.alerts is not None
    assert result.seismic is not None
    assert len(result.unavailable_sources) == 1
    assert_unavailable(
        result,
        service="ANM",
        component="mining",
    )


@pytest.mark.asyncio
async def test_get_location_context_open_meteo_failure_is_partial(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        weather=_fail("Open-Meteo", "Open-Meteo unavailable"),
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.weather is None
    assert result.territory is not None
    assert result.alerts is not None
    assert result.mining is not None
    assert result.seismic is not None
    assert len(result.unavailable_sources) == 1
    assert_unavailable(
        result,
        service="Open-Meteo",
        component="weather",
    )


@pytest.mark.asyncio
async def test_get_location_context_ideam_failure_is_partial(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        alerts=_fail("IDEAM", "IDEAM unavailable"),
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.alerts is None
    assert result.territory is not None
    assert result.weather is not None
    assert result.mining is not None
    assert result.seismic is not None
    assert len(result.unavailable_sources) == 1
    assert_unavailable(
        result,
        service="IDEAM",
        component="hydrological_alerts",
    )


@pytest.mark.asyncio
async def test_get_location_context_sgc_nearby_failure_keeps_recent(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        nearby=_fail("SGC", "SGC nearby unavailable"),
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.seismic is not None
    assert result.seismic.radius_km == 50
    assert result.seismic.count == 0
    assert result.seismic.returned == 0
    assert result.seismic.earthquakes == []
    assert result.seismic.recent.count == 1
    assert result.seismic.recent.returned == 1
    assert (
        result.seismic.recent.earthquakes[0].id
        == "SGC2026test001"
    )
    assert len(result.unavailable_sources) == 1
    assert_unavailable(
        result,
        service="SGC",
        component="nearby_earthquakes",
    )


@pytest.mark.asyncio
async def test_get_location_context_sgc_recent_failure_keeps_nearby(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        recent=_fail("SGC", "SGC recent unavailable"),
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.seismic is not None
    assert result.seismic.count == 1
    assert result.seismic.returned == 1
    assert result.seismic.earthquakes[0].id == 24051
    assert result.seismic.recent.count == 0
    assert result.seismic.recent.returned == 0
    assert result.seismic.recent.earthquakes == []
    assert len(result.unavailable_sources) == 1
    assert_unavailable(
        result,
        service="SGC",
        component="recent_earthquakes",
    )


@pytest.mark.asyncio
async def test_get_location_context_both_sgc_components_fail(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        nearby=_fail("SGC", "SGC nearby unavailable"),
        recent=_fail("SGC", "SGC recent unavailable"),
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.seismic is None
    assert result.territory is not None
    assert len(result.unavailable_sources) == 2
    assert_unavailable(
        result,
        service="SGC",
        component="nearby_earthquakes",
    )
    assert_unavailable(
        result,
        service="SGC",
        component="recent_earthquakes",
    )


@pytest.mark.asyncio
async def test_get_location_context_all_providers_fail(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        territory=_fail("DANE", "DANE unavailable"),
        mining=_fail("ANM", "ANM unavailable"),
        nearby=_fail("SGC", "SGC nearby unavailable"),
        recent=_fail("SGC", "SGC recent unavailable"),
        weather=_fail("Open-Meteo", "Open-Meteo unavailable"),
        alerts=_fail("IDEAM", "IDEAM unavailable"),
    )

    with pytest.raises(ExternalServiceError) as exc_info:
        await service.get_location_context(
            latitude=8.3665,
            longitude=-72.86,
            radius_km=50,
        )

    assert exc_info.value.service == "location_context"
    assert (
        exc_info.value.message
        == "All external providers failed"
    )


@pytest.mark.asyncio
async def test_get_location_context_unexpected_error_propagates(
    monkeypatch,
):
    service = LocationService()

    async def boom_territory(*args, **kwargs):
        raise AttributeError("boom")

    patch_providers(
        monkeypatch,
        service,
        territory=boom_territory,
    )

    with pytest.raises(AttributeError, match="boom"):
        await service.get_location_context(
            latitude=8.3665,
            longitude=-72.86,
            radius_km=50,
        )


@pytest.mark.asyncio
async def test_get_location_context_zero_results_are_not_unavailable(
    monkeypatch,
):
    service = LocationService()
    patch_providers(
        monkeypatch,
        service,
        mining=_empty_mining,
        alerts=_empty_alerts,
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    assert result.mining is not None
    assert result.mining.has_titles is False
    assert result.mining.count == 0
    assert result.mining.titles == []

    assert result.alerts is not None
    assert result.alerts.source == "IDEAM"
    assert result.alerts.hydrological.has_alerts is False
    assert result.alerts.hydrological.count == 0
    assert result.alerts.hydrological.alerts == []

    assert result.unavailable_sources == []
