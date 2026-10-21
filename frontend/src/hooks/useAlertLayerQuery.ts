import { useQuery } from '@tanstack/react-query'
import {
  fetchAlertLayer,
  fetchNationalAlertLayer,
} from '../api/alertLayers'
import type { AlertLayerCollection, AlertLayerType } from '../api/alertLayerSchemas'
import type { MapViewportBounds } from '../utils/alertLayerBbox'
import {
  isActiveAlertLayerMode,
  resolveAlertLayerMode,
  type AlertLayerModeDecision,
  type AlertLayerViewMode,
} from '../utils/alertLayerMode'

export const alertLayerQueryKey = (
  layerType: AlertLayerType,
  mode: AlertLayerViewMode,
  scope: string,
  minLevel = 1,
) => ['alert-layer', layerType, mode, scope, minLevel] as const

/**
 * True si los datos corresponden al modo activo (exclusión mutua).
 * Evita pintar geometría nacional bajo etiqueta regional y viceversa.
 */
export function alertLayerDataMatchesMode(
  data: AlertLayerCollection | undefined,
  mode: AlertLayerViewMode | null,
): data is AlertLayerCollection {
  if (!data || mode == null) {
    return false
  }
  if (mode === 'national') {
    return data.mode === 'national'
  }
  return data.mode !== 'national'
}

/**
 * Consulta independiente por capa IDEAM.
 * Elige endpoint nacional o regional según el viewport (≤1.5° → regional).
 */
export function useAlertLayerQuery(options: {
  layerType: AlertLayerType
  enabled: boolean
  viewport: MapViewportBounds | null
  minLevel?: number
}) {
  const { layerType, enabled, viewport, minLevel = 1 } = options
  const viewMode: AlertLayerModeDecision = resolveAlertLayerMode(viewport)
  const activeMode = isActiveAlertLayerMode(viewMode) ? viewMode.mode : null
  const canFetch = enabled && activeMode != null

  const regionalBbox =
    viewMode.mode === 'regional' ? viewMode.bbox : null
  const queryScope =
    viewMode.mode === 'regional'
      ? viewMode.bbox
      : viewMode.mode === 'national'
        ? 'national'
        : 'idle'

  const query = useQuery({
    queryKey:
      activeMode != null
        ? alertLayerQueryKey(layerType, activeMode, queryScope, minLevel)
        : (['alert-layer', layerType, 'idle'] as const),
    enabled: canFetch,
    queryFn: ({ signal }) => {
      if (viewMode.mode === 'national') {
        return fetchNationalAlertLayer({ layerType, minLevel }, signal)
      }
      if (viewMode.mode === 'regional') {
        return fetchAlertLayer(
          { layerType, bbox: viewMode.bbox, minLevel },
          signal,
        )
      }
      throw new Error('Modo de capa IDEAM no disponible')
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    // No conservar geometría del otro modo durante la transición.
    placeholderData: undefined,
    retry: (failureCount, error) => {
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

  const displayData = alertLayerDataMatchesMode(query.data, activeMode)
    ? query.data
    : undefined

  return {
    ...query,
    data: displayData,
    viewMode,
    activeMode,
    canFetch,
    bbox: regionalBbox,
  }
}
