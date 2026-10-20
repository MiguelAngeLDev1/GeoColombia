import { useQuery } from '@tanstack/react-query'
import {
  fetchAlertLayer,
  type FetchAlertLayerParams,
} from '../api/alertLayers'
import type { AlertLayerType } from '../api/alertLayerSchemas'
import {
  evaluateViewportForAlertLayers,
  type MapViewportBounds,
  type ViewportAlertEligibility,
} from '../utils/alertLayerBbox'

export const alertLayerQueryKey = (
  layerType: AlertLayerType,
  bbox: string,
  minLevel = 1,
) => ['alert-layer', layerType, bbox, minLevel] as const

export function useAlertLayerViewportEligibility(
  viewport: MapViewportBounds | null,
): ViewportAlertEligibility {
  return evaluateViewportForAlertLayers(viewport)
}

/**
 * Consulta independiente por capa IDEAM.
 * Solo se habilita si la capa está activa y el viewport es elegible.
 */
export function useAlertLayerQuery(options: {
  layerType: AlertLayerType
  enabled: boolean
  viewport: MapViewportBounds | null
  minLevel?: number
}) {
  const { layerType, enabled, viewport, minLevel = 1 } = options
  const eligibility = evaluateViewportForAlertLayers(viewport)
  const canFetch = enabled && eligibility.status === 'ok'
  const bbox = eligibility.status === 'ok' ? eligibility.bbox : null

  const query = useQuery({
    queryKey: bbox
      ? alertLayerQueryKey(layerType, bbox, minLevel)
      : (['alert-layer', layerType, 'idle'] as const),
    enabled: canFetch && bbox != null,
    queryFn: ({ signal }) => {
      if (!bbox) {
        throw new Error('Bbox no disponible')
      }

      const params: FetchAlertLayerParams = {
        layerType,
        bbox,
        minLevel,
      }

      return fetchAlertLayer(params, signal)
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      // No reintentar límites del backend (413) ni cancelaciones.
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number'
      ) {
        const status = (error as { status: number }).status
        if (status === 413 || status === 422 || status === 0) {
          return false
        }
      }
      return failureCount < 1
    },
  })

  return {
    ...query,
    eligibility,
    canFetch,
    bbox,
  }
}
