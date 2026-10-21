import type { AlertLayerToggleState } from '../../../hooks/useAlertLayerToggles'
import { useAlertLayerQuery } from '../../../hooks/useAlertLayerQuery'
import { useDebouncedMapViewport } from '../../../hooks/useDebouncedMapViewport'
import { AlertLayerGeoJson } from './AlertLayerGeoJson'
import { AlertLayerStatusBanner } from './AlertLayerStatusBanner'

interface AlertLayersOnMapProps {
  enabled: AlertLayerToggleState
}

/**
 * Orquesta viewport, modo nacional/regional, consultas y geometrías.
 * Una sola geometría por capa (exclusión mutua de modos).
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

  const viewMode = hydrological.viewMode
  const viewportKey =
    viewMode.mode === 'regional'
      ? `regional:${viewMode.bbox}`
      : viewMode.mode === 'national'
        ? 'national'
        : 'inactive'

  return (
    <>
      {enabled.hydrological &&
      hydrological.canFetch &&
      hydrological.data ? (
        <AlertLayerGeoJson
          layerType="hydrological"
          data={hydrological.data}
          viewportKey={viewportKey}
        />
      ) : null}
      {enabled.landslides && landslides.canFetch && landslides.data ? (
        <AlertLayerGeoJson
          layerType="landslides"
          data={landslides.data}
          viewportKey={viewportKey}
        />
      ) : null}
      {enabled.fires && fires.canFetch && fires.data ? (
        <AlertLayerGeoJson
          layerType="fires"
          data={fires.data}
          viewportKey={viewportKey}
        />
      ) : null}

      <AlertLayerStatusBanner
        anyEnabled={anyEnabled}
        enabled={enabled}
        viewMode={viewMode}
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
