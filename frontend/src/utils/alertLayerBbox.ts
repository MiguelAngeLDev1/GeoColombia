/** Límites alineados con el backend de capas IDEAM (5C.1). */

export const ALERT_LAYER_MAX_SPAN_DEG = 1.5

export const ALERT_LAYER_COVERAGE = {
  minLon: -85.0,
  minLat: -6.0,
  maxLon: -65.0,
  maxLat: 16.0,
} as const

export const ALERT_LAYER_VIEWPORT_DEBOUNCE_MS = 350

export interface MapViewportBounds {
  west: number
  south: number
  east: number
  north: number
}

export type ViewportAlertEligibility =
  | {
      status: 'ok'
      bbox: string
      spanLon: number
      spanLat: number
    }
  | {
      status: 'too_large'
      bbox: string
      spanLon: number
      spanLat: number
      message: string
    }
  | {
      status: 'out_of_coverage'
      bbox: string
      spanLon: number
      spanLat: number
      message: string
    }
  | {
      status: 'invalid'
      message: string
    }

export function formatBbox(bounds: MapViewportBounds): string {
  return [
    bounds.west,
    bounds.south,
    bounds.east,
    bounds.north,
  ].join(',')
}

export function getBboxSpans(bounds: MapViewportBounds): {
  spanLon: number
  spanLat: number
} {
  return {
    spanLon: bounds.east - bounds.west,
    spanLat: bounds.north - bounds.south,
  }
}

export function isBboxWithinSpanLimit(bounds: MapViewportBounds): boolean {
  const { spanLon, spanLat } = getBboxSpans(bounds)
  return (
    spanLon <= ALERT_LAYER_MAX_SPAN_DEG &&
    spanLat <= ALERT_LAYER_MAX_SPAN_DEG &&
    spanLon > 0 &&
    spanLat > 0
  )
}

/** True si el bbox no está completamente fuera de la cobertura esperada. */
export function isBboxWithinCoverage(bounds: MapViewportBounds): boolean {
  const coverage = ALERT_LAYER_COVERAGE
  return !(
    bounds.east < coverage.minLon ||
    bounds.west > coverage.maxLon ||
    bounds.north < coverage.minLat ||
    bounds.south > coverage.maxLat
  )
}

export function evaluateViewportForAlertLayers(
  bounds: MapViewportBounds | null,
): ViewportAlertEligibility {
  if (!bounds) {
    return {
      status: 'invalid',
      message: 'Viewport no disponible.',
    }
  }

  const { spanLon, spanLat } = getBboxSpans(bounds)
  const bbox = formatBbox(bounds)

  if (
    !Number.isFinite(spanLon) ||
    !Number.isFinite(spanLat) ||
    spanLon <= 0 ||
    spanLat <= 0
  ) {
    return {
      status: 'invalid',
      message: 'Viewport inválido.',
    }
  }

  if (!isBboxWithinCoverage(bounds)) {
    return {
      status: 'out_of_coverage',
      bbox,
      spanLon,
      spanLat,
      message: 'El área visible está fuera de la cobertura de alertas IDEAM.',
    }
  }

  if (!isBboxWithinSpanLimit(bounds)) {
    return {
      status: 'too_large',
      bbox,
      spanLon,
      spanLat,
      message: 'Acércate para visualizar las alertas',
    }
  }

  return {
    status: 'ok',
    bbox,
    spanLon,
    spanLat,
  }
}
