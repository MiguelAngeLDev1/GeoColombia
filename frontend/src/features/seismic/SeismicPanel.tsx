import { SectionCard } from '../../components/SectionCard'
import {
  resolveNearbySeismicSection,
  resolveRecentSeismicSection,
  unavailableMessageFor,
} from '../../services/contextSections'
import type {
  Earthquake,
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

export function SeismicPanel({
  seismic,
  unavailableSources,
}: SeismicPanelProps) {
  const nearbyState = resolveNearbySeismicSection(
    seismic,
    unavailableSources,
  )
  const recentState = resolveRecentSeismicSection(
    seismic,
    unavailableSources,
  )

  return (
    <div className="space-y-3">
      <SectionCard
        title="Sismos del catálogo histórico"
        subtitle={
          seismic
            ? `SGC · eventos en un radio de ${seismic.radius_km} km (pueden ser antiguos)`
            : 'SGC · catálogo histórico'
        }
        state={nearbyState}
        emptyMessage={`Sin registros del catálogo histórico en un radio de ${seismic?.radius_km ?? 50} km.`}
        unavailableMessage={unavailableMessageFor(
          unavailableSources,
          'nearby_earthquakes',
        )}
      >
        <EarthquakeList
          items={seismic?.earthquakes ?? []}
          emptyLabel="Sin eventos para listar."
        />
        <p className="mt-2 text-[11px] leading-relaxed text-geo-mist/60">
          Estos eventos pertenecen al catálogo histórico del SGC. La fecha
          indica cuándo ocurrieron; no son necesariamente recientes.
        </p>
      </SectionCard>

      <SectionCard
        title="Sismos recientes (sentidos)"
        subtitle="SGC · sismos sentidos publicados recientemente"
        state={recentState}
        emptyMessage="Sin sismos recientes de Sismos Sentidos para este punto."
        unavailableMessage={unavailableMessageFor(
          unavailableSources,
          'recent_earthquakes',
        )}
      >
        <RecentEarthquakeList items={seismic?.recent.earthquakes ?? []} />
        <p className="mt-2 text-[11px] leading-relaxed text-geo-mist/60">
          Eventos del servicio de sismos sentidos. Distintos del catálogo
          histórico.
        </p>
      </SectionCard>
    </div>
  )
}

function EarthquakeList({
  items,
  emptyLabel,
}: {
  items: Earthquake[]
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-geo-mist/80">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-white/8 rounded-lg border border-white/8">
      {items.map((quake) => (
        <li key={quake.id} className="px-2.5 py-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-geo-fog">
              {formatMagnitude(quake.magnitude) ?? 'Magnitud n/d'}
            </span>
            <span className="shrink-0 whitespace-nowrap text-xs text-geo-mist/75">
              {formatDistanceKm(quake.distance_km) ?? 'Distancia n/d'}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-geo-mist/80">
            {[
              formatDateTime(quake.occurred_at),
              formatDepthKm(quake.depth_km)
                ? `Prof. ${formatDepthKm(quake.depth_km)}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Sin detalle temporal'}
          </p>
        </li>
      ))}
    </ul>
  )
}

function RecentEarthquakeList({ items }: { items: RecentEarthquake[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-geo-mist/80">Sin eventos para listar.</p>
    )
  }

  return (
    <ul className="divide-y divide-white/8 rounded-lg border border-white/8">
      {items.map((quake) => (
        <li key={quake.id} className="px-2.5 py-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-geo-fog">
              {formatMagnitude(quake.magnitude) ?? 'Magnitud n/d'}
            </span>
            <span className="shrink-0 whitespace-nowrap text-xs text-geo-mist/75">
              {formatDistanceKm(quake.distance_km) ?? 'Distancia n/d'}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-geo-mist/80">
            {[
              quake.location,
              formatDateTime(quake.occurred_at),
              formatDepthKm(quake.depth_km)
                ? `Prof. ${formatDepthKm(quake.depth_km)}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </li>
      ))}
    </ul>
  )
}
