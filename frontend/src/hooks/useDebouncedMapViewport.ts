import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import {
  ALERT_LAYER_VIEWPORT_DEBOUNCE_MS,
  type MapViewportBounds,
} from '../utils/alertLayerBbox'

function readMapBounds(map: {
  getBounds: () => {
    getWest: () => number
    getSouth: () => number
    getEast: () => number
    getNorth: () => number
  }
}): MapViewportBounds {
  const bounds = map.getBounds()
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  }
}

/**
 * Viewport Leaflet con debounce en moveend/zoomend.
 * Debe usarse dentro de un MapContainer.
 */
export function useDebouncedMapViewport(
  debounceMs = ALERT_LAYER_VIEWPORT_DEBOUNCE_MS,
): MapViewportBounds | null {
  const map = useMap()
  const [viewport, setViewport] = useState<MapViewportBounds | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const commit = () => {
      setViewport(readMapBounds(map))
    }

    const schedule = () => {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      timer = setTimeout(commit, debounceMs)
    }

    commit()
    map.on('moveend', schedule)
    map.on('zoomend', schedule)

    return () => {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      map.off('moveend', schedule)
      map.off('zoomend', schedule)
    }
  }, [map, debounceMs])

  return viewport
}
