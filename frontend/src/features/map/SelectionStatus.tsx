import type { MapPoint } from '../../hooks/useMapSelection'
import { formatMapPoint } from '../../utils/coordinates'

interface SelectionStatusProps {
  selectedPoint: MapPoint | null
}

/** Barra compacta de selección: invita a elegir o muestra lat/lng. */
export function SelectionStatus({ selectedPoint }: SelectionStatusProps) {
  if (!selectedPoint) {
    return (
      <div
        className="rounded-xl border border-dashed border-geo-accent/35 bg-geo-forest/30 px-3 py-2 text-sm text-geo-mist sm:px-4 sm:py-2.5"
        role="status"
        aria-live="polite"
      >
        <p className="text-geo-fog">
          <span className="font-medium">Sin punto seleccionado.</span>{' '}
          <span className="text-geo-mist/85">
            Toca el mapa para elegir una ubicación.
          </span>
        </p>
      </div>
    )
  }

  const formatted = formatMapPoint(selectedPoint)

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-geo-accent/40 bg-geo-forest/45 px-3 py-2 text-sm sm:px-4"
      role="status"
      aria-live="polite"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-geo-accent">
        Punto
      </span>
      <span className="font-mono text-geo-fog whitespace-nowrap">
        {formatted.latitude}
      </span>
      <span className="text-geo-mist/40" aria-hidden="true">
        ·
      </span>
      <span className="font-mono text-geo-fog whitespace-nowrap">
        {formatted.longitude}
      </span>
    </div>
  )
}
