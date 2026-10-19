import { SectionCard } from '../../components/SectionCard'
import {
  resolveRecentSeismicSection,
  unavailableMessageFor,
} from '../../services/contextSections'
import type {
  RecentEarthquake,
  SeismicContext,
  UnavailableSource,
} from '../../types/location'
import { formatDateTime } from '../../utils/formatDateTime'
import {
  formatDepthKm,
  formatDistanceKm,
  formatMagnitude,
} from '../../utils/formatUnits'

interface SeismicPanelProps {
  seismic: SeismicContext | null | undefined
  unavailableSources: UnavailableSource[]
}

const EMPTY_RECENT_MESSAGE =
  'No se encontraron eventos recientes de Sismos Sentidos con epicentro dentro del radio consultado'

/**
 * Actividad sísmica reciente (Sismos Sentidos).
 * El catálogo histórico sigue en el contrato API pero no se muestra.
 */
export function SeismicPanel({
  seismic,
  unavailableSources,
}: SeismicPanelProps) {
  const recentState = resolveRecentSeismicSection(
    seismic,
    unavailableSources,
  )
  const radiusKm = seismic?.radius_km
  const events = sortRecentEarthquakes(seismic?.recent.earthquakes ?? [])

  return (
    <SectionCard
      title="Actividad sísmica reciente"
      subtitle="Eventos registrados en Sismos Sentidos del Servicio Geológico Colombiano, con epicentro dentro del radio de consulta"
      state={recentState}
      emptyMessage={EMPTY_RECENT_MESSAGE}
      unavailableMessage={unavailableMessageFor(
        unavailableSources,
        'recent_earthquakes',
      )}
    >
      <RecentEarthquakeList items={events} />
      <p className="mt-2 text-[11px] leading-relaxed text-geo-mist/60">
        El epicentro indica el origen del evento. No implica que el sismo se
        haya sentido en el punto seleccionado
        {radiusKm != null ? ` (radio ${radiusKm} km)` : ''}.
      </p>
    </SectionCard>
  )
}

function sortRecentEarthquakes(
  items: RecentEarthquake[],
): RecentEarthquake[] {
  return [...items].sort((a, b) => {
    const timeA = a.occurred_at ? Date.parse(a.occurred_at) : Number.NaN
    const timeB = b.occurred_at ? Date.parse(b.occurred_at) : Number.NaN
    const validA = Number.isFinite(timeA)
    const validB = Number.isFinite(timeB)

    if (validA && validB) {
      return timeB - timeA
    }
    if (validA) {
      return -1
    }
    if (validB) {
      return 1
    }
    return 0
  })
}

function RecentEarthquakeList({ items }: { items: RecentEarthquake[] }) {
  if (items.length === 0) {
    return null
  }

  return (
    <ul className="divide-y divide-white/8 rounded-lg border border-white/8">
      {items.map((quake) => (
        <li key={quake.id} className="px-2.5 py-2 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="font-display text-base font-semibold text-geo-fog">
              {formatMagnitude(quake.magnitude) ?? 'Magnitud n/d'}
            </span>
            {formatDistanceKm(quake.distance_km) ? (
              <span className="shrink-0 whitespace-nowrap text-xs text-geo-mist/75">
                {formatDistanceKm(quake.distance_km)}
              </span>
            ) : null}
          </div>

          <dl className="mt-1 space-y-0.5 text-xs leading-snug text-geo-mist/85">
            {quake.location ? (
              <div>
                <span className="text-geo-mist/60">Epicentro: </span>
                {quake.location}
              </div>
            ) : null}
            {formatDateTime(quake.occurred_at) ? (
              <div>
                <span className="text-geo-mist/60">Fecha: </span>
                <span className="whitespace-nowrap">
                  {formatDateTime(quake.occurred_at)}
                </span>
              </div>
            ) : null}
            {formatDepthKm(quake.depth_km) ? (
              <div>
                <span className="text-geo-mist/60">Profundidad: </span>
                {formatDepthKm(quake.depth_km)}
              </div>
            ) : null}
            {quake.max_intensity != null &&
            Number.isFinite(quake.max_intensity) ? (
              <div>
                <span className="text-geo-mist/60">
                  Intensidad máxima reportada:{' '}
                </span>
                {quake.max_intensity}
                <span className="block text-[10px] text-geo-mist/55">
                  Valor general del evento; no indica la intensidad en el
                  municipio del punto seleccionado.
                </span>
              </div>
            ) : null}
          </dl>
        </li>
      ))}
    </ul>
  )
}
