import type {
  LocationContextQueryParams,
  LocationContextResponse,
} from '../types/location'
import { assertValidCoordinates } from '../utils/validateCoordinates'
import { buildApiUrlWithSearch, fetchJson } from './client'
import { ApiError } from './errors'
import { locationContextResponseSchema } from './locationSchemas'

export const DEFAULT_LOCATION_RADIUS_KM = 50
export const DEFAULT_EARTHQUAKE_LIMIT = 10

export const LOCATION_CONTEXT_PATH = '/api/v1/location/context'

export function buildLocationContextSearchParams(
  params: LocationContextQueryParams,
): URLSearchParams {
  assertValidCoordinates(params.latitude, params.longitude)

  const search = new URLSearchParams()
  search.set('latitude', String(params.latitude))
  search.set('longitude', String(params.longitude))
  search.set(
    'radius_km',
    String(params.radius_km ?? DEFAULT_LOCATION_RADIUS_KM),
  )
  search.set(
    'earthquake_limit',
    String(params.earthquake_limit ?? DEFAULT_EARTHQUAKE_LIMIT),
  )

  return search
}

export function buildLocationContextUrl(
  params: LocationContextQueryParams,
): string {
  return buildApiUrlWithSearch(
    LOCATION_CONTEXT_PATH,
    buildLocationContextSearchParams(params),
  )
}

export async function fetchLocationContext(
  params: LocationContextQueryParams,
  signal?: AbortSignal,
): Promise<LocationContextResponse> {
  const url = buildLocationContextUrl(params)
  const payload = await fetchJson<unknown>(url, {
    method: 'GET',
    signal,
  })

  const parsed = locationContextResponseSchema.safeParse(payload)

  if (!parsed.success) {
    throw new ApiError(
      'validation',
      0,
      'La respuesta de /location/context no coincide con el contrato esperado.',
      parsed.error.flatten(),
    )
  }

  return parsed.data as LocationContextResponse
}
