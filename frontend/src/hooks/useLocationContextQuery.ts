import { useQuery } from '@tanstack/react-query'
import {
  DEFAULT_EARTHQUAKE_LIMIT,
  DEFAULT_LOCATION_RADIUS_KM,
  fetchLocationContext,
} from '../api/location'
import type { MapPoint } from './useMapSelection'

export const locationContextQueryKey = (
  point: MapPoint,
  radiusKm = DEFAULT_LOCATION_RADIUS_KM,
  earthquakeLimit = DEFAULT_EARTHQUAKE_LIMIT,
) =>
  [
    'location-context',
    point.latitude,
    point.longitude,
    radiusKm,
    earthquakeLimit,
  ] as const

/**
 * Consulta /location/context tipada con cancelación por AbortSignal
 * y clave de consulta por coordenadas (evita resultados obsoletos).
 */
export function useLocationContextQuery(selectedPoint: MapPoint | null) {
  return useQuery({
    queryKey: selectedPoint
      ? locationContextQueryKey(selectedPoint)
      : (['location-context', 'idle'] as const),
    enabled: selectedPoint != null,
    queryFn: ({ signal }) => {
      if (!selectedPoint) {
        throw new Error('No hay punto seleccionado')
      }

      return fetchLocationContext(
        {
          latitude: selectedPoint.latitude,
          longitude: selectedPoint.longitude,
          radius_km: DEFAULT_LOCATION_RADIUS_KM,
          earthquake_limit: DEFAULT_EARTHQUAKE_LIMIT,
        },
        signal,
      )
    },
    staleTime: 60_000,
    retry: 1,
  })
}
