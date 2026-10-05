from datetime import datetime, timezone

import pytest

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


@pytest.mark.asyncio
async def test_get_location_context_combines_territory_mining_seismic_and_weather_data(
    monkeypatch,
):
    service = LocationService()

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

    async def mock_get_titles_at_point(
        latitude: float,
        longitude: float,
    ):
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

    async def mock_get_nearby_earthquakes(
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

    async def mock_get_recent_earthquakes(
        limit: int = 20,
    ):
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

    monkeypatch.setattr(
        service.territory_service,
        "get_territory_at_point",
        mock_get_territory_at_point,
    )

    monkeypatch.setattr(
        service.mining_service,
        "get_titles_at_point",
        mock_get_titles_at_point,
    )

    monkeypatch.setattr(
        service.earthquake_service,
        "get_nearby_earthquakes",
        mock_get_nearby_earthquakes,
    )

    monkeypatch.setattr(
        service.earthquake_service,
        "get_recent_earthquakes",
        mock_get_recent_earthquakes,
    )

    monkeypatch.setattr(
        service.weather_service,
        "get_weather",
        mock_get_weather,
    )

    result = await service.get_location_context(
        latitude=8.3665,
        longitude=-72.86,
        radius_km=50,
    )

    # Coordenada consultada
    assert result.location.latitude == 8.3665
    assert result.location.longitude == -72.86

    # Contexto territorial
    assert result.territory.department is not None
    assert result.territory.department.code == "54"
    assert result.territory.department.name == "Norte De Santander"

    assert result.territory.municipality is not None
    assert result.territory.municipality.code == "54720"
    assert result.territory.municipality.name == "Sardinata"
    assert result.territory.municipality.type == "Municipio"
    assert result.territory.municipality.area_km2 == 1451.17

    assert result.territory.reference_year == 2024

    # Contexto meteorológico
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
        result.weather.today.precipitation_probability_max_percent
        == 49
    )
    assert result.weather.today.precipitation_sum_mm == 0.3
    assert result.weather.today.uv_index_max == 9.15

    assert len(result.weather.next_hours) == 2
    assert result.weather.next_hours[0].time.hour == 22
    assert result.weather.next_hours[0].temperature_c == 21.2
    assert (
        result.weather.next_hours[0]
        .precipitation_probability_percent
        == 20
    )

    # Contexto minero
    assert result.mining.has_titles is True
    assert result.mining.count == 1
    assert len(result.mining.titles) == 1

    mining_title = result.mining.titles[0]

    assert mining_title.code == "TDG-08281"
    assert mining_title.status == "Activo"
    assert mining_title.stage == "Exploración"
    assert mining_title.minerals == "CARBÓN"
    assert mining_title.departments == "Norte de Santander"
    assert mining_title.municipalities == "SARDINATA"

    # Catálogo sísmico histórico
    assert result.seismic.radius_km == 50
    assert result.seismic.count == 1
    assert result.seismic.returned == 1
    assert len(result.seismic.earthquakes) == 1

    earthquake = result.seismic.earthquakes[0]

    assert earthquake.id == 24051
    assert earthquake.distance_km == 5.0

    # Sismicidad reciente
    assert result.seismic.recent.count == 1
    assert result.seismic.recent.returned == 1
    assert len(result.seismic.recent.earthquakes) == 1

    recent_earthquake = result.seismic.recent.earthquakes[0]

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

    async def mock_get_titles_at_point(
        latitude: float,
        longitude: float,
    ):
        return MiningTitleListResponse(
            source="Agencia Nacional de Minería",
            coordinates={
                "latitude": latitude,
                "longitude": longitude,
            },
            count=0,
            data=[],
        )

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

    monkeypatch.setattr(
        service.territory_service,
        "get_territory_at_point",
        mock_get_territory_at_point,
    )

    monkeypatch.setattr(
        service.mining_service,
        "get_titles_at_point",
        mock_get_titles_at_point,
    )

    monkeypatch.setattr(
        service.earthquake_service,
        "get_nearby_earthquakes",
        mock_get_nearby_earthquakes,
    )

    monkeypatch.setattr(
        service.earthquake_service,
        "get_recent_earthquakes",
        mock_get_recent_earthquakes,
    )

    monkeypatch.setattr(
        service.weather_service,
        "get_weather",
        mock_get_weather,
    )

    result = await service.get_location_context(
        latitude=3.87,
        longitude=-75.63,
        radius_km=50,
        earthquake_limit=5,
        recent_earthquake_limit=3,
    )

    # El catálogo encontró 20, pero devolvemos 5
    assert result.seismic.count == 20
    assert result.seismic.returned == 5
    assert len(result.seismic.earthquakes) == 5

    # Hay 10 recientes dentro del radio, pero devolvemos 3
    assert result.seismic.recent.count == 10
    assert result.seismic.recent.returned == 3
    assert len(result.seismic.recent.earthquakes) == 3

    # Deben quedar ordenados del más reciente al más antiguo
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

    # La distancia calculada debe exponerse en la respuesta
    for earthquake in result.seismic.recent.earthquakes:
        assert earthquake.distance_km is not None
        assert earthquake.distance_km <= 50
        assert earthquake.distance_km == round(
            earthquake.distance_km,
            2,
        )

    # Weather también forma parte del contexto,
    # aunque este test esté enfocado en los límites sísmicos.
    assert result.weather.source == "Open-Meteo"
    assert result.weather.current.temperature_c == 21.5
    assert result.weather.today is None
    assert result.weather.next_hours == []