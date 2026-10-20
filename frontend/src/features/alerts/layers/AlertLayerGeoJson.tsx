import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON } from 'react-leaflet'
import type {
  AlertLayerCollection,
  AlertLayerFeature,
  AlertLayerType,
} from '../../../api/alertLayerSchemas'
import {
  getAlertLayerPathOptions,
  isActiveAlertLevel,
} from '../../../utils/alertLayerStyles'
import { buildAlertLayerPopupHtml } from './alertLayerPopupHtml'

interface AlertLayerGeoJsonProps {
  layerType: AlertLayerType
  data: AlertLayerCollection | undefined
  /** Clave estable del viewport para remount y evitar geometrías obsoletas. */
  viewportKey: string
}

function filterActiveFeatures(
  collection: AlertLayerCollection | undefined,
): AlertLayerCollection | null {
  if (!collection) {
    return null
  }

  const features = collection.features.filter((feature) =>
    isActiveAlertLevel(feature.properties.level),
  )

  return {
    ...collection,
    features,
    count: features.length,
  }
}

/**
 * Renderiza polígonos oficiales IDEAM.
 * Detiene la propagación del clic para no disparar la consulta por punto.
 */
export function AlertLayerGeoJson({
  layerType,
  data,
  viewportKey,
}: AlertLayerGeoJsonProps) {
  const layerRef = useRef<L.GeoJSON | null>(null)
  const filtered = useMemo(() => filterActiveFeatures(data), [data])

  useEffect(() => {
    return () => {
      layerRef.current = null
    }
  }, [viewportKey, layerType])

  if (!filtered || filtered.features.length === 0) {
    return null
  }

  return (
    <GeoJSON
      key={`${layerType}-${viewportKey}-${filtered.features.length}`}
      data={filtered as GeoJSON.FeatureCollection}
      ref={(instance) => {
        layerRef.current = instance
      }}
      style={(feature) => {
        const level = (
          feature as AlertLayerFeature | undefined
        )?.properties?.level
        return getAlertLayerPathOptions(layerType, level)
      }}
      onEachFeature={(feature, layer) => {
        const properties = (feature as AlertLayerFeature).properties
        if (!properties || !isActiveAlertLevel(properties.level)) {
          return
        }

        layer.bindPopup(buildAlertLayerPopupHtml(properties), {
          maxWidth: 280,
          className: 'geo-alert-popup-pane',
        })

        layer.on({
          click(event) {
            L.DomEvent.stopPropagation(event)
            if (event.originalEvent) {
              L.DomEvent.stop(event.originalEvent)
            }
          },
        })
      }}
    />
  )
}
