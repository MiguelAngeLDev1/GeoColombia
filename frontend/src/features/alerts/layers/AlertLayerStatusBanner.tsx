import type { UseQueryResult } from '@tanstack/react-query'
import type { AlertLayerCollection, AlertLayerType } from '../../../api/alertLayerSchemas'
import { isApiError } from '../../../api/errors'
import type { AlertLayerToggleState } from '../../../hooks/useAlertLayerToggles'
import type { ViewportAlertEligibility } from '../../../utils/alertLayerBbox'
import { ALERT_LAYER_LABELS } from '../../../utils/alertLayerStyles'

interface LayerQuerySlice {
  layerType: AlertLayerType
  enabled: boolean
  query: Pick<
    UseQueryResult<AlertLayerCollection, Error>,
    'isFetching' | 'isError' | 'error' | 'data' | 'isSuccess'
  >
}

interface AlertLayerStatusBannerProps {
  anyEnabled: boolean
  enabled: AlertLayerToggleState
  eligibility: ViewportAlertEligibility
  layers: LayerQuerySlice[]
}

function describeHttpError(error: unknown): string {
  if (!isApiError(error)) {
    return 'No fue posible cargar la capa.'
  }

  if (error.status === 413) {
    return error.message || 'La respuesta es demasiado grande. Acerque el mapa.'
  }

  if (error.status === 502) {
    return error.message || 'IDEAM no respondió correctamente.'
  }

  if (error.status === 422) {
    return error.message || 'Parámetros de consulta inválidos.'
  }

  return error.message || 'Error al consultar la capa.'
}

/**
 * Estados de carga/error/zoom por capa, sin bloquear el resto del mapa.
 */
export function AlertLayerStatusBanner({
  anyEnabled,
  enabled,
  eligibility,
  layers,
}: AlertLayerStatusBannerProps) {
  if (!anyEnabled) {
    return null
  }

  const messages: string[] = []

  if (eligibility.status === 'too_large') {
    messages.push(eligibility.message)
  } else if (eligibility.status === 'out_of_coverage') {
    messages.push(eligibility.message)
  } else if (eligibility.status === 'ok') {
    for (const layer of layers) {
      if (!layer.enabled) {
        continue
      }

      const label = ALERT_LAYER_LABELS[layer.layerType]

      if (layer.query.isFetching && !layer.query.data) {
        messages.push(`${label}: cargando…`)
        continue
      }

      if (layer.query.isError) {
        messages.push(`${label}: ${describeHttpError(layer.query.error)}`)
        continue
      }

      if (
        layer.query.isSuccess &&
        (layer.query.data?.features.length ?? 0) === 0
      ) {
        messages.push(`${label}: sin entidades en esta ventana.`)
      }
    }
  }

  if (messages.length === 0) {
    // Resumen mínimo cuando hay capas activas y datos visibles.
    const activeLabels = (
      Object.keys(enabled) as AlertLayerType[]
    )
      .filter((key) => enabled[key])
      .map((key) => ALERT_LAYER_LABELS[key])

    if (eligibility.status === 'ok' && activeLabels.length > 0) {
      return (
        <div
          className="pointer-events-none absolute bottom-8 right-2 z-[1000] max-w-[min(100%-1rem,16rem)] rounded-lg border border-white/10 bg-geo-ink/80 px-2 py-1 text-[10px] text-geo-mist/90 backdrop-blur-sm sm:bottom-10 sm:right-3 sm:text-[11px]"
          role="status"
        >
          Capas activas: {activeLabels.join(' · ')}
        </div>
      )
    }

    return null
  }

  return (
    <div
      className="pointer-events-none absolute bottom-8 right-2 z-[1000] max-w-[min(100%-1rem,17rem)] space-y-1 sm:bottom-10 sm:right-3"
      role="status"
      aria-live="polite"
    >
      {messages.map((message) => (
        <p
          key={message}
          className="rounded-lg border border-amber-400/25 bg-geo-ink/90 px-2 py-1 text-[10px] leading-snug text-amber-50/95 shadow backdrop-blur-sm sm:text-[11px]"
        >
          {message}
        </p>
      ))}
    </div>
  )
}
