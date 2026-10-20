import L from 'leaflet'
import { CircleMarker, Popup } from 'react-leaflet'
import { getMagnitudeCircleOptions } from '../../../utils/earthquakeMagnitudeStyles'
import { EarthquakePopupContent } from './EarthquakePopupContent'
import type { MappableEarthquake } from './normalizeRecentEarthquakes'

interface EarthquakeMarkerProps {
  earthquake: MappableEarthquake
}

/**
 * Epicentro como CircleMarker. Detiene la propagación del clic
 * para no disparar la consulta por punto del mapa.
 */
export function EarthquakeMarker({ earthquake }: EarthquakeMarkerProps) {
  return (
    <CircleMarker
      center={[earthquake.latitude, earthquake.longitude]}
      pathOptions={getMagnitudeCircleOptions(earthquake.magnitude)}
      eventHandlers={{
        click(event) {
          L.DomEvent.stopPropagation(event)
          if (event.originalEvent) {
            L.DomEvent.stop(event.originalEvent)
          }
        },
        mouseover(event) {
          // Enjambres (p. ej. Chaparral): trae al frente el epicentro bajo el cursor.
          event.target.bringToFront()
        },
      }}
    >
      <Popup className="geo-quake-popup-pane" maxWidth={280}>
        <EarthquakePopupContent earthquake={earthquake} />
      </Popup>
    </CircleMarker>
  )
}
