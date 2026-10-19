import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { MapPoint } from '../../hooks/useMapSelection'
import { COLOMBIA_USER_LOCATION_ZOOM } from '../../utils/colombia'

export interface MapFocusRequest {
  point: MapPoint
  /** Cambia en cada solicitud de enfoque para re-disparar flyTo. */
  nonce: number
  zoom?: number
}

interface MapFlyToProps {
  focusRequest: MapFocusRequest | null
}

/**
 * Centra el mapa con animación cuando llega un focusRequest (p. ej. geolocalización).
 * No realiza llamadas HTTP.
 */
export function MapFlyTo({ focusRequest }: MapFlyToProps) {
  const map = useMap()
  const lastNonceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!focusRequest) {
      return
    }

    if (lastNonceRef.current === focusRequest.nonce) {
      return
    }

    lastNonceRef.current = focusRequest.nonce
    const zoom = focusRequest.zoom ?? COLOMBIA_USER_LOCATION_ZOOM

    map.flyTo(
      [focusRequest.point.latitude, focusRequest.point.longitude],
      zoom,
      { duration: 1.15 },
    )
  }, [focusRequest, map])

  return null
}
