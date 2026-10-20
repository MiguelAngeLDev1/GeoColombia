import type { AlertLayerToggleState } from '../../../hooks/useAlertLayerToggles'
import { useAlertLayerQuery } from '../../../hooks/useAlertLayerQuery'
import { useDebouncedMapViewport } from '../../../hooks/useDebouncedMapViewport'
import { AlertLayerGeoJson } from './AlertLayerGeoJson'
import { AlertLayerStatusBanner } from './AlertLayerStatusBanner'

interface AlertLayersOnMapProps {
  enabled: AlertLayerToggleState
}

/**
 * Orquesta viewport, consultas y geometrías dentro del MapContainer.
 * Sin lógica de toggles ni controles UI.
 */
export function AlertLayersOnMap({ enabled }: AlertLayersOnMapProps) {
  const viewport = useDebouncedMapViewport()
  const anyEnabled =
    enabled.hydrological || enabled.landslides || enabled.fires

  const hydrological = useAlertLayerQuery({
    layerType: 'hydrological',
    enabled: enabled.hydrological,
    viewport,
  })
  const landslides = useAlertLayerQuery({
    layerType: 'landslides',
    enabled: enabled.landslides,
    viewport,
  })
  const fires = useAlertLayerQuery({
    layerType: 'fires',
    enabled: enabled.fires,
    viewport,
  })

  const eligibility = hydrological.eligibility
  const viewportKey =
    eligibility.status === 'ok' ? eligibility.bbox : 'inactive'

  return (
    <>
      {enabled.hydrological && hydrological.canFetch ? (
        <AlertLayerGeoJson
          layerType="hydrological"
          data={hydrological.data}
          viewportKey={viewportKey}
        />
      ) : null}
      {enabled.landslides && landslides.canFetch ? (
        <AlertLayerGeoJson
          layerType="landslides"
          data={landslides.data}
          viewportKey={viewportKey}
        />
      ) : null}
      {enabled.fires && fires.canFetch ? (
        <AlertLayerGeoJson
          layerType="fires"
          data={fires.data}
          viewportKey={viewportKey}
        />
      ) : null}

      <AlertLayerStatusBanner
        anyEnabled={anyEnabled}
        enabled={enabled}
        eligibility={eligibility}
        layers={[
          {
            layerType: 'hydrological',
            enabled: enabled.hydrological,
            query: hydrological,
          },
          {
            layerType: 'landslides',
            enabled: enabled.landslides,
            query: landslides,
          },
          {
            layerType: 'fires',
            enabled: enabled.fires,
            query: fires,
          },
        ]}
      />
    </>
  )
}
