import { useQuery } from '@tanstack/react-query'
import { fetchEarthquakeDetail } from '../api/earthquakes'

export const earthquakeDetailQueryKey = (earthquakeId: string) =>
  ['earthquake-detail', earthquakeId] as const

/**
 * Detalle bajo demanda: no se consulta hasta enabled=true.
 */
export function useEarthquakeDetailQuery(
  earthquakeId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: earthquakeId
      ? earthquakeDetailQueryKey(earthquakeId)
      : (['earthquake-detail', 'idle'] as const),
    enabled: enabled && earthquakeId != null && earthquakeId.length > 0,
    queryFn: ({ signal }) => {
      if (!earthquakeId) {
        throw new Error('Identificador de sismo no disponible')
      }
      return fetchEarthquakeDetail(earthquakeId, signal)
    },
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
  })
}
