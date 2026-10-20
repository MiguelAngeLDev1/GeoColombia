import { useState } from 'react'
import type { RecentEarthquakeEvent } from '../../../api/earthquakeSchemas'
import { useEarthquakeDetailQuery } from '../../../hooks/useEarthquakeDetailQuery'
import { formatDateTime } from '../../../utils/formatDateTime'
import {
  formatDepthKm,
  formatMagnitude,
} from '../../../utils/formatUnits'
import { FeltReportsPanel } from './FeltReportsPanel'

interface EarthquakePopupContentProps {
  earthquake: RecentEarthquakeEvent
}

export function EarthquakePopupContent({
  earthquake,
}: EarthquakePopupContentProps) {
  const [loadDetail, setLoadDetail] = useState(false)
  const [showAllReports, setShowAllReports] = useState(false)
  const detailQuery = useEarthquakeDetailQuery(earthquake.id, loadDetail)

  // Solo usar reportes del mismo id (evita residuos al cambiar de marcador).
  const detailMatchesEvent =
    detailQuery.data?.data.id === earthquake.id
  const feltLocations = detailMatchesEvent
    ? (detailQuery.data?.data.felt_locations ?? [])
    : []

  return (
    <div className="geo-quake-popup min-w-[12rem] max-w-[16.5rem] text-left text-geo-fog">
      <strong className="block text-[13px] text-geo-fog">
        {formatMagnitude(earthquake.magnitude) ?? 'Magnitud n/d'}
      </strong>
      <p className="mt-0.5 font-mono text-[10px] text-geo-mist/55">
        {earthquake.id}
      </p>

      <dl className="mt-1.5 space-y-1 text-[11px] leading-snug text-geo-mist/90">
        {formatDateTime(earthquake.occurred_at) ? (
          <div>
            <dt className="inline text-geo-mist/60">Fecha: </dt>
            <dd className="inline">{formatDateTime(earthquake.occurred_at)}</dd>
          </div>
        ) : null}
        {earthquake.location ? (
          <div>
            <dt className="inline text-geo-mist/60">Epicentro: </dt>
            <dd className="inline">{earthquake.location}</dd>
          </div>
        ) : null}
        {formatDepthKm(earthquake.depth_km) ? (
          <div>
            <dt className="inline text-geo-mist/60">Profundidad: </dt>
            <dd className="inline">{formatDepthKm(earthquake.depth_km)}</dd>
          </div>
        ) : null}
        {earthquake.max_intensity != null &&
        Number.isFinite(earthquake.max_intensity) ? (
          <div>
            <dt className="inline text-geo-mist/60">
              Intensidad máxima reportada:{' '}
            </dt>
            <dd className="inline">{earthquake.max_intensity}</dd>
          </div>
        ) : null}
        <div>
          <dt className="inline text-geo-mist/60">Fuente: </dt>
          <dd className="inline">Servicio Geológico Colombiano</dd>
        </div>
      </dl>

      <p className="mt-2 text-[10px] leading-snug text-geo-mist/65">
        La ubicación corresponde al epicentro. La intensidad máxima no
        representa necesariamente lo sentido en el municipio seleccionado.
      </p>

      {!loadDetail ? (
        <button
          type="button"
          className="mt-2 rounded-md border border-geo-accent/45 bg-geo-forest/50 px-2 py-1 text-[11px] font-medium text-geo-fog hover:border-geo-accent/70"
          onClick={(event) => {
            event.stopPropagation()
            setLoadDetail(true)
          }}
        >
          Ver reportes de intensidad
        </button>
      ) : (
        <FeltReportsPanel
          locations={feltLocations}
          isLoading={
            detailQuery.isFetching &&
            !(detailMatchesEvent && detailQuery.data)
          }
          isError={detailQuery.isError}
          error={detailQuery.error}
          showAll={showAllReports}
          onShowAll={() => setShowAllReports(true)}
        />

      )}
    </div>
  )
}
