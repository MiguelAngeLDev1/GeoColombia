import type { FeltLocation } from '../../../api/earthquakeSchemas'
import { isApiError } from '../../../api/errors'
import { formatDistanceKm } from '../../../utils/formatUnits'

const INITIAL_VISIBLE = 8

interface FeltReportsPanelProps {
  locations: FeltLocation[]
  isLoading: boolean
  isError: boolean
  error: unknown
  showAll: boolean
  onShowAll: () => void
}

function locationLabel(item: FeltLocation): string {
  return (
    item.municipality?.trim() ||
    item.population_center?.trim() ||
    'Lugar no identificado'
  )
}

export function FeltReportsPanel({
  locations,
  isLoading,
  isError,
  error,
  showAll,
  onShowAll,
}: FeltReportsPanelProps) {
  if (isLoading) {
    return (
      <p className="mt-2 text-[11px] text-geo-mist/80">
        Cargando reportes de intensidad…
      </p>
    )
  }

  if (isError) {
    const message = isApiError(error)
      ? error.message
      : 'No fue posible consultar los reportes.'
    return (
      <p className="mt-2 text-[11px] text-amber-100/90" role="alert">
        {message}
      </p>
    )
  }

  if (locations.length === 0) {
    return (
      <p className="mt-2 text-[11px] leading-snug text-geo-mist/75">
        No hay reportes municipales disponibles en la fuente consultada.
        Esto no implica que el sismo no se haya sentido en algún lugar.
      </p>
    )
  }

  const visible = showAll
    ? locations
    : locations.slice(0, INITIAL_VISIBLE)
  const remaining = locations.length - visible.length

  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-geo-mist/70">
        Reportes oficiales de intensidad
      </p>
      <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-[11px] leading-snug text-geo-fog">
        {visible.map((item, index) => (
          <li
            key={`${item.municipality_code ?? item.municipality ?? index}-${item.population_center_code ?? index}`}
            className="rounded border border-white/10 bg-white/5 px-1.5 py-1"
          >
            <span className="font-medium">{locationLabel(item)}</span>
            <span className="mt-0.5 block text-geo-mist/80">
              Intensidad:{' '}
              {item.intensity != null && Number.isFinite(item.intensity)
                ? item.intensity
                : 'n/d'}
              {' · '}
              Reportes: {item.reports}
              {formatDistanceKm(item.distance_km)
                ? ` · ${formatDistanceKm(item.distance_km)} del epicentro`
                : ''}
            </span>
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <button
          type="button"
          className="mt-1 text-[11px] font-medium text-geo-accent underline-offset-2 hover:underline"
          onClick={onShowAll}
        >
          Mostrar {remaining} más
        </button>
      ) : null}
      <p className="mt-1.5 text-[10px] leading-snug text-geo-mist/60">
        Intensidades reportadas por ciudadanos vía SGC; no son mediciones
        instrumentales locales.
      </p>
    </div>
  )
}
