import { isApiError } from '../../../api/errors'

interface SeismicLayerStatusProps {
  enabled: boolean
  isLoading: boolean
  isError: boolean
  error: unknown
  markerCount: number
  /** Desplaza el banner si la leyenda IDEAM también está visible. */
  offsetForIdeamLegend?: boolean
}

export function SeismicLayerStatus({
  enabled,
  isLoading,
  isError,
  error,
  markerCount,
  offsetForIdeamLegend = false,
}: SeismicLayerStatusProps) {
  if (!enabled) {
    return null
  }

  let message: string | null = null

  if (isLoading && markerCount === 0) {
    message = 'Sismos recientes: cargando…'
  } else if (isError) {
    message = isApiError(error)
      ? `Sismos recientes: ${error.message}`
      : 'Sismos recientes: no fue posible consultar al SGC.'
  } else if (!isLoading && markerCount === 0) {
    message = 'Sismos recientes: sin eventos con coordenadas válidas.'
  }

  if (!message) {
    return null
  }

  return (
    <div
      className={`pointer-events-none absolute right-2 z-[1000] max-w-[min(100%-1rem,16rem)] rounded-lg border border-amber-400/25 bg-geo-ink/90 px-2 py-1 text-[10px] leading-snug text-amber-50/95 shadow backdrop-blur-sm sm:right-3 sm:text-[11px] ${
        offsetForIdeamLegend
          ? 'bottom-[7.5rem] sm:bottom-[8.5rem]'
          : 'bottom-8 sm:bottom-10'
      }`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
