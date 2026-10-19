import type { UseQueryResult } from '@tanstack/react-query'
import { isApiError } from '../../api/errors'
import { FireAlertsPanel } from '../alerts/FireAlertsPanel'
import { HydrologicalAlertsPanel } from '../alerts/HydrologicalAlertsPanel'
import { LandslideAlertsPanel } from '../alerts/LandslideAlertsPanel'
import { SeismicPanel } from '../seismic/SeismicPanel'
import { TerritoryPanel } from '../territory/TerritoryPanel'
import { WeatherPanel } from '../weather/WeatherPanel'
import type { MapPoint } from '../../hooks/useMapSelection'
import { buildLocationHeadline } from '../../services/contextSections'
import { listUnavailableSourceMessages } from '../../services/locationSummaries'
import type { LocationContextResponse } from '../../types/location'
import { formatMapPoint } from '../../utils/coordinates'

interface LocationResultsPanelProps {
  selectedPoint: MapPoint | null
  query: UseQueryResult<LocationContextResponse, Error>
}

export function LocationResultsPanel({
  selectedPoint,
  query,
}: LocationResultsPanelProps) {
  // Evita mostrar datos de la ubicación anterior al cambiar de punto.
  const isLoadingNewLocation =
    selectedPoint != null &&
    (query.isPending ||
      query.isLoading ||
      (query.isFetching && query.data === undefined))

  return (
    <aside
      className="rounded-[1.5rem] border border-white/10 bg-geo-forest/35 shadow-[0_18px_50px_rgba(6,28,24,0.35)] lg:flex lg:max-h-[min(78dvh,48rem)] lg:flex-col lg:overflow-hidden"
      aria-label="Resultados de la ubicación"
    >
      <div className="border-b border-white/10 px-4 py-3 sm:px-5">
        <h2 className="font-display text-lg text-geo-fog">
          Contexto de la ubicación
        </h2>
        <p className="mt-1 text-xs text-geo-mist/75">
          Fuentes oficiales · radio 50 km
        </p>
      </div>

      {/* Móvil: crece con el contenido y usa scroll de página.
          Escritorio: scroll interno en el panel sticky. */}
      <div className="px-4 py-4 sm:px-5 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {!selectedPoint ? (
          <IdleState />
        ) : isLoadingNewLocation ? (
          <LoadingState point={selectedPoint} />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data ? (
          <SuccessState data={query.data} />
        ) : (
          <IdleState />
        )}
      </div>
    </aside>
  )
}

function IdleState() {
  return (
    <div
      className="rounded-xl border border-dashed border-geo-accent/30 bg-geo-ink/30 px-4 py-5 text-sm text-geo-mist"
      role="status"
    >
      <p className="font-medium text-geo-fog">Selecciona un punto en el mapa</p>
      <p className="mt-2 leading-relaxed text-geo-mist/80">
        Al elegir una ubicación se consultará territorio, clima, sismos y
        alertas IDEAM.
      </p>
    </div>
  )
}

function LoadingState({ point }: { point: MapPoint }) {
  const formatted = formatMapPoint(point)

  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <p className="text-sm text-geo-mist">
        Consultando contexto para {formatted.latitude}, {formatted.longitude}…
      </p>
      <div className="space-y-2" aria-hidden="true">
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
      </div>
    </div>
  )
}

function ErrorState({
  error,
  onRetry,
}: {
  error: Error
  onRetry: () => void
}) {
  const message = isApiError(error)
    ? error.status === 422
      ? 'Los parámetros de la consulta no son válidos.'
      : error.status === 502
        ? 'Los proveedores externos no respondieron. Intenta de nuevo en unos momentos.'
        : error.message
    : 'No se pudo obtener el contexto de la ubicación.'

  return (
    <div
      className="space-y-4 rounded-xl border border-red-400/30 bg-red-950/30 px-4 py-5"
      role="alert"
    >
      <div>
        <p className="font-medium text-red-100">Error al consultar</p>
        <p className="mt-1 text-sm leading-relaxed text-red-100/80">{message}</p>
        {isApiError(error) && error.status > 0 ? (
          <p className="mt-2 font-mono text-xs text-red-200/70">
            HTTP {error.status}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-10 rounded-lg border border-geo-accent/50 bg-geo-accent/20 px-3 py-2 text-sm font-medium text-geo-fog transition hover:bg-geo-accent/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-geo-accent"
      >
        Reintentar
      </button>
    </div>
  )
}

function SuccessState({ data }: { data: LocationContextResponse }) {
  const unavailableMessages = listUnavailableSourceMessages(data)
  const unavailable = data.unavailable_sources
  const headline = buildLocationHeadline(data)

  return (
    <div className="space-y-3.5">
      <div className="rounded-xl border border-geo-accent/25 bg-geo-ink/25 px-3.5 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-geo-accent">
          Ubicación
        </p>
        <p className="mt-1 text-sm font-medium text-geo-fog">{headline}</p>
        <p className="mt-1 font-mono text-xs text-geo-mist/75 whitespace-nowrap">
          {data.location.latitude.toFixed(5)},{' '}
          {data.location.longitude.toFixed(5)}
        </p>
      </div>

      {unavailableMessages.length > 0 ? (
        <div
          className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-100/90"
          role="status"
        >
          <p className="font-medium">Respuesta parcial</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
            {unavailableMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <TerritoryPanel
        territory={data.territory}
        unavailableSources={unavailable}
      />
      <WeatherPanel
        weather={data.weather}
        unavailableSources={unavailable}
      />
      <HydrologicalAlertsPanel
        alerts={data.alerts}
        unavailableSources={unavailable}
      />
      <LandslideAlertsPanel
        alerts={data.alerts}
        unavailableSources={unavailable}
      />
      <FireAlertsPanel
        alerts={data.alerts}
        unavailableSources={unavailable}
      />
      <SeismicPanel
        seismic={data.seismic}
        unavailableSources={unavailable}
      />
    </div>
  )
}
