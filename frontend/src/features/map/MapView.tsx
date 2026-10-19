import { useMemo } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import type { MapPoint } from '../../hooks/useMapSelection'
import {
  COLOMBIA_DEFAULT_ZOOM,
  COLOMBIA_MAP_CENTER,
} from '../../utils/colombia'
import { MapClickHandler } from './MapClickHandler'
import { MapFlyTo, type MapFocusRequest } from './MapFlyTo'
import { MapResizeFix } from './MapResizeFix'
import { createSelectionIcon, ensureLeafletDefaultIcons } from './leafletSetup'
import 'leaflet/dist/leaflet.css'

ensureLeafletDefaultIcons()

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

interface MapViewProps {
  selectedPoint: MapPoint | null
  onSelectPoint: (point: MapPoint) => void
  /** Enfoque animado (geolocalización); no implica llamadas HTTP. */
  focusRequest?: MapFocusRequest | null
}

/**
 * Mapa interactivo de Colombia (Leaflet + OSM).
 * Solo presentación e interacción cartográfica.
 */
export function MapView({
  selectedPoint,
  onSelectPoint,
  focusRequest = null,
}: MapViewProps) {
  const selectionIcon = useMemo(() => createSelectionIcon(), [])

  return (
    <div
      className="geo-map-shell relative isolate h-[min(58dvh,32rem)] min-h-[16rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-geo-forest/50 shadow-[0_24px_80px_rgba(6,28,24,0.45)] sm:h-[min(68dvh,40rem)] sm:min-h-[22rem] sm:rounded-[1.75rem]"
      role="region"
      aria-label="Mapa interactivo de Colombia"
    >
      <MapContainer
        center={[
          COLOMBIA_MAP_CENTER.latitude,
          COLOMBIA_MAP_CENTER.longitude,
        ]}
        zoom={COLOMBIA_DEFAULT_ZOOM}
        className="geo-map-canvas h-full w-full"
        scrollWheelZoom
        doubleClickZoom
        touchZoom
        dragging
        zoomControl
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        <MapResizeFix />
        <MapFlyTo focusRequest={focusRequest} />
        <MapClickHandler onSelect={onSelectPoint} />
        {selectedPoint ? (
          <Marker
            position={[selectedPoint.latitude, selectedPoint.longitude]}
            icon={selectionIcon}
            alt="Punto seleccionado"
          />
        ) : null}
      </MapContainer>
    </div>
  )
}
