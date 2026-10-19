import type { MapPoint } from '../../hooks/useMapSelection'
import { formatMapPoint } from '../../utils/coordinates'

interface SelectionStatusProps {
  selectedPoint: MapPoint | null
}

/** Panel de estado de selección: sin punto o coordenadas legibles. */
export function SelectionStatus({ selectedPoint }: SelectionStatusProps) {
  if (!selectedPoint) {
    return (
      <div
        className="rounded-2xl border border-dashed border-geo-accent/35 bg-geo-forest/30 px-4 py-3 text-sm text-geo-mist sm:px-5 sm:py-4"
        role="status"
        aria-live="polite"
      >
        <p className="font-medium text-geo-fog">Sin punto seleccionado</p>
        <p className="mt-1 leading-relaxed text-geo-mist/85">
          Toca o haz clic en el mapa para elegir una ubicación en Colombia.
        </p>
      </div>
    )
  }

  const formatted = formatMapPoint(selectedPoint)

  return (
    <div
      className="rounded-2xl border border-geo-accent/40 bg-geo-forest/45 px-4 py-3 sm:px-5 sm:py-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-geo-accent">
        Punto seleccionado
      </p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div>
          <dt className="text-xs text-geo-mist/70">Latitud</dt>
          <dd className="font-mono text-sm text-geo-fog sm:text-base">
            {formatted.latitude}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-geo-mist/70">Longitud</dt>
          <dd className="font-mono text-sm text-geo-fog sm:text-base">
            {formatted.longitude}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-geo-mist/70">
        Puedes tocar otro lugar del mapa para cambiar el punto.
      </p>
    </div>
  )
}
