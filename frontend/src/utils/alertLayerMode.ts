/**
 * Selector de modo IDEAM según extensión del viewport.
 *
 * Regional: span lon y lat ≤ 1.5° (límite del endpoint bbox).
 * Nacional: cualquier span > 1.5° dentro de cobertura.
 *
 * Nunca produce un bbox > 1.5° para el modo regional.
 * Sin histéresis: el umbral es exacto (≤1.5 → regional); el debounce
 * del viewport (~350 ms) amortigua oscilaciones en el borde.
 */

import {
  ALERT_LAYER_MAX_SPAN_DEG,
  evaluateViewportForAlertLayers,
  getBboxSpans,
  isBboxWithinCoverage,
  type MapViewportBounds,
} from './alertLayerBbox'

export type AlertLayerViewMode = 'regional' | 'national'

export type AlertLayerModeDecision =
  | {
      mode: 'regional'
      bbox: string
      spanLon: number
      spanLat: number
    }
  | {
      mode: 'national'
      bbox: string
      spanLon: number
      spanLat: number
    }
  | {
      mode: 'unavailable'
      reason: 'invalid' | 'out_of_coverage'
      message: string
      bbox?: string
      spanLon?: number
      spanLat?: number
    }

export const NATIONAL_PRECISION_BANNER =
  'Vista nacional simplificada. Los límites son aproximados; acércate para consultar el detalle regional'

export const REGIONAL_PRECISION_BANNER = 'Vista regional detallada'

/**
 * Decide si consultar /national o el endpoint regional con bbox.
 */
export function resolveAlertLayerMode(
  bounds: MapViewportBounds | null,
): AlertLayerModeDecision {
  const eligibility = evaluateViewportForAlertLayers(bounds)

  if (eligibility.status === 'invalid') {
    return {
      mode: 'unavailable',
      reason: 'invalid',
      message: eligibility.message,
    }
  }

  if (eligibility.status === 'out_of_coverage') {
    return {
      mode: 'unavailable',
      reason: 'out_of_coverage',
      message: eligibility.message,
      bbox: eligibility.bbox,
      spanLon: eligibility.spanLon,
      spanLat: eligibility.spanLat,
    }
  }

  // status ok | too_large — ambos dentro de cobertura.
  const { spanLon, spanLat } = eligibility
  const bbox = eligibility.bbox

  if (
    spanLon <= ALERT_LAYER_MAX_SPAN_DEG &&
    spanLat <= ALERT_LAYER_MAX_SPAN_DEG
  ) {
    // Doble verificación: nunca enviar bbox ilegal al endpoint regional.
    if (!bounds || !isBboxWithinCoverage(bounds)) {
      return {
        mode: 'unavailable',
        reason: 'out_of_coverage',
        message: 'El área visible está fuera de la cobertura de alertas IDEAM.',
        bbox,
        spanLon,
        spanLat,
      }
    }

    const spans = getBboxSpans(bounds)
    if (
      spans.spanLon > ALERT_LAYER_MAX_SPAN_DEG ||
      spans.spanLat > ALERT_LAYER_MAX_SPAN_DEG
    ) {
      return {
        mode: 'national',
        bbox,
        spanLon: spans.spanLon,
        spanLat: spans.spanLat,
      }
    }

    return {
      mode: 'regional',
      bbox,
      spanLon,
      spanLat,
    }
  }

  return {
    mode: 'national',
    bbox,
    spanLon,
    spanLat,
  }
}

export function isActiveAlertLayerMode(
  decision: AlertLayerModeDecision,
): decision is Extract<
  AlertLayerModeDecision,
  { mode: 'regional' | 'national' }
> {
  return decision.mode === 'regional' || decision.mode === 'national'
}
