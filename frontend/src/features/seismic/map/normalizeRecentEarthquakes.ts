import type { RecentEarthquakeEvent } from '../../../api/earthquakeSchemas'
import { MAX_RECENT_EARTHQUAKE_LIMIT } from '../../../api/earthquakes'
import { hasValidEarthquakeCoordinates } from '../../../utils/earthquakeMagnitudeStyles'

export interface MappableEarthquake extends RecentEarthquakeEvent {
  latitude: number
  longitude: number
}

/**
 * Filtra coordenadas inválidas, elimina duplicados por id
 * (conserva el primero = más reciente si ya viene ordenado)
 * y aplica tope de marcadores.
 */
export function normalizeRecentEarthquakes(
  events: RecentEarthquakeEvent[],
  maxMarkers = MAX_RECENT_EARTHQUAKE_LIMIT,
): MappableEarthquake[] {
  const seen = new Set<string>()
  const result: MappableEarthquake[] = []

  for (const event of events) {
    if (result.length >= maxMarkers) {
      break
    }

    if (!event.id || seen.has(event.id)) {
      continue
    }

    if (
      !hasValidEarthquakeCoordinates(event.latitude, event.longitude)
    ) {
      continue
    }

    seen.add(event.id)
    result.push({
      ...event,
      latitude: event.latitude as number,
      longitude: event.longitude as number,
    })
  }

  return result
}

/** Ordena por fecha descendente (más reciente primero). */
export function sortEarthquakesByDateDesc(
  events: RecentEarthquakeEvent[],
): RecentEarthquakeEvent[] {
  return [...events].sort((a, b) => {
    const timeA = a.occurred_at ? Date.parse(a.occurred_at) : Number.NaN
    const timeB = b.occurred_at ? Date.parse(b.occurred_at) : Number.NaN
    const validA = Number.isFinite(timeA)
    const validB = Number.isFinite(timeB)

    if (validA && validB) {
      return timeB - timeA
    }
    if (validA) {
      return -1
    }
    if (validB) {
      return 1
    }
    return 0
  })
}
