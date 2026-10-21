import type { UseQueryResult } from '@tanstack/react-query'
import type { AlertLayerCollection, AlertLayerType } from '../../../api/alertLayerSchemas'
import { isApiError } from '../../../api/errors'
import type { AlertLayerToggleState } from '../../../hooks/useAlertLayerToggles'
import {
  NATIONAL_PRECISION_BANNER,
  REGIONAL_PRECISION_BANNER,
  type AlertLayerModeDecision,
} from '../../../utils/alertLayerMode'
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
  viewMode: AlertLayerModeDecision
  layers: LayerQuerySlice[]
}

function describeHttpError(error: unknown, modeLabel: string): string {
  if (!isApiError(error)) {
    return `No fue posible cargar la capa (${modeLabel}).`
  }

  if (error.status === 413) {
    return (
      error.message ||
      `La respuesta ${modeLabel} es demasiado grande.`
    )
  }

  if (error.status === 502) {
    return error.message || 'IDEAM no respondió correctamente.'
  }

  if (error.status === 422) {
    return error.message || 'Parámetros de consulta inválidos.'
  }

  return error.message || `Error al consultar la capa (${modeLabel}).`
}

function modeLabel(viewMode: AlertLayerModeDecision): string {
  if (viewMode.mode === 'national') {
    return 'nacional'
  }
  if (viewMode.mode === 'regional') {
    return 'regional'
  }
  return 'IDEAM'
}

/**
 * Estados de carga/error/precisión por capa, sin bloquear el resto del mapa.
 */
export function AlertLayerStatusBanner({
  anyEnabled,
  enabled,
  viewMode,
  layers,
}: AlertLayerStatusBannerProps) {
  if (!anyEnabled) {
    return null
  }

  const messages: string[] = []
  const label = modeLabel(viewMode)

  if (viewMode.mode === 'unavailable') {
    messages.push(viewMode.message)
  } else {
    for (const layer of layers) {
      if (!layer.enabled) {
        continue
      }

      const layerLabel = ALERT_LAYER_LABELS[layer.layerType]

      if (layer.query.isFetching && !layer.query.data) {
        messages.push(`${layerLabel}: cargando vista ${label}…`)
        continue
      }

      if (layer.query.isError) {
        messages.push(
          `${layerLabel}: ${describeHttpError(layer.query.error, label)}`,
        )
        continue
      }

      if (
        layer.query.isSuccess &&
        (layer.query.data?.features.length ?? 0) === 0
      ) {
        messages.push(`${layerLabel}: sin entidades en esta vista.`)
      }
    }

    const hasVisibleSuccess = layers.some(
      (layer) =>
        layer.enabled &&
        layer.query.isSuccess &&
        (layer.query.data?.features.length ?? 0) > 0,
    )

    if (hasVisibleSuccess || messages.length === 0) {
      if (viewMode.mode === 'national') {
        messages.unshift(NATIONAL_PRECISION_BANNER)
      } else if (viewMode.mode === 'regional') {
        messages.unshift(REGIONAL_PRECISION_BANNER)
      }
    }
  }

  if (messages.length === 0) {
    const activeLabels = (Object.keys(enabled) as AlertLayerType[])
      .filter((key) => enabled[key])
      .map((key) => ALERT_LAYER_LABELS[key])

    if (activeLabels.length > 0 && viewMode.mode !== 'unavailable') {
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
