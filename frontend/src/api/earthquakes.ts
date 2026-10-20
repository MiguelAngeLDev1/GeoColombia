import {
  earthquakeDetailResponseSchema,
  recentEarthquakeListResponseSchema,
  type EarthquakeDetailResponse,
  type RecentEarthquakeListResponse,
} from './earthquakeSchemas'
import { buildApiUrl, buildApiUrlWithSearch, fetchJson } from './client'
import { ApiError } from './errors'

export const EARTHQUAKES_PATH = '/api/v1/earthquakes'
export const DEFAULT_RECENT_EARTHQUAKE_LIMIT = 100
export const MAX_RECENT_EARTHQUAKE_LIMIT = 100

export function buildRecentEarthquakesUrl(
  limit = DEFAULT_RECENT_EARTHQUAKE_LIMIT,
): string {
  const capped = Math.min(
    Math.max(1, Math.floor(limit)),
    MAX_RECENT_EARTHQUAKE_LIMIT,
  )
  const search = new URLSearchParams()
  search.set('limit', String(capped))
  return buildApiUrlWithSearch(`${EARTHQUAKES_PATH}/recent`, search)
}

export function buildEarthquakeDetailUrl(earthquakeId: string): string {
  const encoded = encodeURIComponent(earthquakeId)
  return buildApiUrl(`${EARTHQUAKES_PATH}/${encoded}`)
}

/** Listado nacional de Sismos Sentidos (no filtrado por radio). */
export async function fetchRecentEarthquakes(
  limit = DEFAULT_RECENT_EARTHQUAKE_LIMIT,
  signal?: AbortSignal,
): Promise<RecentEarthquakeListResponse> {
  const payload = await fetchJson<unknown>(buildRecentEarthquakesUrl(limit), {
    method: 'GET',
    signal,
  })

  const parsed = recentEarthquakeListResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiError(
      'validation',
      0,
      'La respuesta de /earthquakes/recent no coincide con el contrato esperado.',
      parsed.error.flatten(),
    )
  }

  return parsed.data
}

/** Detalle bajo demanda (reportes municipales de intensidad). */
export async function fetchEarthquakeDetail(
  earthquakeId: string,
  signal?: AbortSignal,
): Promise<EarthquakeDetailResponse> {
  const payload = await fetchJson<unknown>(
    buildEarthquakeDetailUrl(earthquakeId),
    {
      method: 'GET',
      signal,
    },
  )

  const parsed = earthquakeDetailResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiError(
      'validation',
      0,
      'La respuesta de detalle sísmico no coincide con el contrato esperado.',
      parsed.error.flatten(),
    )
  }

  return parsed.data
}
