import { useMapEvents } from 'react-leaflet'
import type { MapPoint } from '../../hooks/useMapSelection'

interface MapClickHandlerProps {
  onSelect: (point: MapPoint) => void
}

/** Escucha clics/toques en el mapa y reporta coordenadas WGS84. */
export function MapClickHandler({ onSelect }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      })
    },
  })

  return null
}
