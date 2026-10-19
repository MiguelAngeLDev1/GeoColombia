import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let configured = false

/**
 * Corrige las rutas de iconos por defecto de Leaflet en bundlers (Vite).
 * Idempotente para evitar reconfigurar en hot reload.
 */
export function ensureLeafletDefaultIcons(): void {
  if (configured) {
    return
  }

  const iconPrototype = L.Icon.Default.prototype as L.Icon.Default & {
    _getIconUrl?: unknown
  }

  delete iconPrototype._getIconUrl

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })

  configured = true
}

/** Marcador visual alineado a la paleta GeoColombia. */
export function createSelectionIcon(): L.DivIcon {
  return L.divIcon({
    className: 'geo-map-marker',
    html: `
      <span class="geo-map-marker__pin" aria-hidden="true">
        <span class="geo-map-marker__dot"></span>
      </span>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  })
}
