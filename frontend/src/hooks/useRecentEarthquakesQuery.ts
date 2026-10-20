import { useQuery } from '@tanstack/react-query'
import {
  DEFAULT_RECENT_EARTHQUAKE_LIMIT,
  fetchRecentEarthquakes,
} from '../api/earthquakes'
import {
  normalizeRecentEarthquakes,
  sortEarthquakesByDateDesc,
} from '../features/seismic/map/normalizeRecentEarthquakes'

export const recentEarthquakesQueryKey = (
  limit = DEFAULT_RECENT_EARTHQUAKE_LIMIT,
) => ['earthquakes-recent', limit] as const

/**
 * Consulta nacional independiente de /location/context.
 * Solo se habilita cuando la capa de sismos está activa.
 */
export function useRecentEarthquakesQuery(options: {
  enabled: boolean
  limit?: number
}) {
  const limit = options.limit ?? DEFAULT_RECENT_EARTHQUAKE_LIMIT

  const query = useQuery({
    queryKey: recentEarthquakesQueryKey(limit),
    enabled: options.enabled,
    queryFn: ({ signal }) => fetchRecentEarthquakes(limit, signal),
    staleTime: 120_000,
    gcTime: 10 * 60_000,
    retry: (failureCount, error) => {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number'
      ) {
        const status = (error as { status: number }).status
        if (status === 502 || status === 0 || status === 404) {
          return false
        }
      }
      return failureCount < 1
    },
  })

  const markers = options.enabled
    ? normalizeRecentEarthquakes(
        sortEarthquakesByDateDesc(query.data?.data ?? []),
        limit,
      )
    : []

  return {
    ...query,
    markers,
    source: query.data?.source ?? 'Servicio Geológico Colombiano',
  }
}
