import type { MapPoint } from '../hooks/useMapSelection'

const COORDINATE_FRACTION_DIGITS = 5

export function formatLatitude(latitude: number): string {
  const hemisphere = latitude >= 0 ? 'N' : 'S'
  return `${Math.abs(latitude).toFixed(COORDINATE_FRACTION_DIGITS)}° ${hemisphere}`
}

export function formatLongitude(longitude: number): string {
  const hemisphere = longitude >= 0 ? 'E' : 'O'
  return `${Math.abs(longitude).toFixed(COORDINATE_FRACTION_DIGITS)}° ${hemisphere}`
}

export function formatMapPoint(point: MapPoint): {
  latitude: string
  longitude: string
} {
  return {
    latitude: formatLatitude(point.latitude),
    longitude: formatLongitude(point.longitude),
  }
}
