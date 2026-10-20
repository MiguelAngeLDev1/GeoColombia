import type { AlertLayerCollection, AlertLayerType } from './alertLayerSchemas'
import { alertLayerCollectionSchema, alertLayerTypeSchema } from './alertLayerSchemas'
import { buildApiUrlWithSearch, fetchJson } from './client'
import { ApiError } from './errors'

export const ALERT_LAYERS_PATH_PREFIX = '/api/v1/alerts/layers'

export interface FetchAlertLayerParams {
  layerType: AlertLayerType
  bbox: string
  minLevel?: number
}

export function buildAlertLayerPath(layerType: AlertLayerType): string {
  const parsed = alertLayerTypeSchema.safeParse(layerType)
  if (!parsed.success) {
    throw new ApiError(
      'validation',
      0,
      `Tipo de capa no soportado: ${String(layerType)}`,
    )
  }

  return `${ALERT_LAYERS_PATH_PREFIX}/${parsed.data}`
}

export function buildAlertLayerSearchParams(
  params: Omit<FetchAlertLayerParams, 'layerType'>,
): URLSearchParams {
  const search = new URLSearchParams()
  search.set('bbox', params.bbox)
  search.set('min_level', String(params.minLevel ?? 1))
  return search
}

export function buildAlertLayerUrl(params: FetchAlertLayerParams): string {
  return buildApiUrlWithSearch(
    buildAlertLayerPath(params.layerType),
    buildAlertLayerSearchParams(params),
  )
}

/**
 * Consulta GeoJSON oficial IDEAM por bbox.
 * Valida el contrato; no inventa niveles ni geometrías.
 */
export async function fetchAlertLayer(
  params: FetchAlertLayerParams,
  signal?: AbortSignal,
): Promise<AlertLayerCollection> {
  const url = buildAlertLayerUrl(params)
  const payload = await fetchJson<unknown>(url, {
    method: 'GET',
    signal,
  })

  const parsed = alertLayerCollectionSchema.safeParse(payload)

  if (!parsed.success) {
    throw new ApiError(
      'validation',
      0,
      'La respuesta de capas IDEAM no coincide con el contrato esperado.',
      parsed.error.flatten(),
    )
  }

  return parsed.data
}
