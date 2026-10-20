import { useRecentEarthquakesQuery } from '../../../hooks/useRecentEarthquakesQuery'
import { EarthquakeMarker } from './EarthquakeMarker'
import { SeismicLayerStatus } from './SeismicLayerStatus'

interface SeismicMarkersOnMapProps {
  enabled: boolean
  ideamLayersActive?: boolean
}

/**
 * Consulta y renderiza epicentros nacionales dentro del MapContainer.
 */
export function SeismicMarkersOnMap({
  enabled,
  ideamLayersActive = false,
}: SeismicMarkersOnMapProps) {
  const query = useRecentEarthquakesQuery({ enabled })

  return (
    <>
      {enabled
        ? query.markers.map((earthquake) => (
            <EarthquakeMarker
              key={earthquake.id}
              earthquake={earthquake}
            />
          ))
        : null}
      <SeismicLayerStatus
        enabled={enabled}
        isLoading={query.isFetching}
        isError={query.isError}
        error={query.error}
        markerCount={query.markers.length}
        offsetForIdeamLegend={ideamLayersActive}
      />
    </>
  )
}
