/**
 * Contratos alineados con los esquemas Pydantic de FastAPI.
 * Nullability respetada según LocationContextResponse.
 */

export interface LocationCoordinates {
  latitude: number
  longitude: number
}

export interface UnavailableSource {
  service: string
  component: string
  message: string
}

export interface Department {
  code: string
  name: string
}

export interface Municipality {
  code: string
  name: string
  type?: string | null
  area_km2?: number | null
}

export interface TerritoryContext {
  department?: Department | null
  municipality?: Municipality | null
  reference_year?: number | null
}

export interface MiningTitle {
  code: string
  area_ha?: number | null
  registration_date?: string | null
  status?: string | null
  modality?: string | null
  stage?: string | null
  minerals?: string | null
  departments?: string | null
  municipalities?: string | null
}

export interface MiningContext {
  has_titles: boolean
  count: number
  titles: MiningTitle[]
}

export interface Earthquake {
  id: number
  magnitude: number | null
  depth_km: number | null
  occurred_at: string | null
  latitude: number | null
  longitude: number | null
  municipality_code?: string | null
  department_code?: string | null
  distance_km?: number | null
}

export interface RecentEarthquake {
  id: string
  magnitude?: number | null
  depth_km?: number | null
  occurred_at?: string | null
  latitude?: number | null
  longitude?: number | null
  location?: string | null
  max_intensity?: number | null
  distance_km?: number | null
}

export interface RecentSeismicContext {
  count: number
  returned: number
  earthquakes: RecentEarthquake[]
}

export interface SeismicContext {
  radius_km: number
  count: number
  returned: number
  earthquakes: Earthquake[]
  recent: RecentSeismicContext
}

export interface CurrentWeatherContext {
  observed_at?: string | null
  temperature_c?: number | null
  feels_like_c?: number | null
  condition?: string | null
  humidity_percent?: number | null
  precipitation_mm?: number | null
  is_raining: boolean
  wind_speed_kmh?: number | null
}

export interface TodayWeatherContext {
  temperature_min_c?: number | null
  temperature_max_c?: number | null
  precipitation_probability_max_percent?: number | null
  precipitation_sum_mm?: number | null
  uv_index_max?: number | null
}

export interface NextHourWeatherContext {
  time: string
  temperature_c?: number | null
  condition?: string | null
  precipitation_probability_percent?: number | null
  rain_mm?: number | null
}

export interface WeatherContext {
  source: string
  timezone: string
  current: CurrentWeatherContext
  today?: TodayWeatherContext | null
  next_hours: NextHourWeatherContext[]
}

export type AlertLevel = 'yellow' | 'orange' | 'red' | 'unknown'

export interface HydrologicalAlert {
  id?: number | null
  type?: 'hydrological'
  level: AlertLevel
  level_code?: number | null
  level_label?: string | null
  department?: string | null
  hydrographic_area_code?: number | null
  hydrographic_area?: string | null
  hydrographic_zone_code?: number | null
  hydrographic_zone?: string | null
  hydrographic_subzone_code?: number | null
  hydrographic_subzone?: string | null
}

export interface LandslideAlert {
  id?: number | null
  type?: 'landslide'
  level: AlertLevel
  level_code?: number | null
  level_label?: string | null
  department?: string | null
  municipality?: string | null
  municipality_code?: string | null
  region?: string | null
}

export interface FireAlert {
  id?: number | null
  type?: 'fire'
  level: AlertLevel
  level_code?: number | null
  level_label?: string | null
  department?: string | null
  municipality?: string | null
  municipality_code?: string | null
  region?: string | null
}

export interface HydrologicalAlertsContext {
  has_alerts: boolean
  count: number
  alerts: HydrologicalAlert[]
}

export interface LandslideAlertsContext {
  has_alerts: boolean
  count: number
  alerts: LandslideAlert[]
}

export interface FireAlertsContext {
  has_alerts: boolean
  count: number
  alerts: FireAlert[]
}

export interface AlertsContext {
  source: string
  hydrological?: HydrologicalAlertsContext | null
  landslides?: LandslideAlertsContext | null
  fires?: FireAlertsContext | null
}

export interface LocationContextResponse {
  location: LocationCoordinates
  territory?: TerritoryContext | null
  weather?: WeatherContext | null
  alerts?: AlertsContext | null
  mining?: MiningContext | null
  seismic?: SeismicContext | null
  unavailable_sources: UnavailableSource[]
}

export type SectionUiState =
  | 'idle'
  | 'loading'
  | 'available'
  | 'empty_ok'
  | 'source_unavailable'
  | 'error'

export type LocationContextComponent =
  | 'territory'
  | 'mining'
  | 'weather'
  | 'hydrological_alerts'
  | 'landslide_alerts'
  | 'fire_alerts'
  | 'nearby_earthquakes'
  | 'recent_earthquakes'

export interface LocationContextQueryParams {
  latitude: number
  longitude: number
  radius_km?: number
  earthquake_limit?: number
}
