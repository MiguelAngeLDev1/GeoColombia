import type { CircleMarkerOptions } from 'leaflet'

export type MagnitudeBand = 'lt3' | '3to4' | '4to5' | 'gte5'

export interface MagnitudeStyle {
  band: MagnitudeBand
  label: string
  color: string
  fillColor: string
  radius: number
}

export const MAGNITUDE_STYLES: Record<MagnitudeBand, MagnitudeStyle> = {
  lt3: {
    band: 'lt3',
    label: 'M < 3',
    color: '#166534',
    fillColor: '#22c55e',
    radius: 5,
  },
  '3to4': {
    band: '3to4',
    label: 'M 3 – 3.9',
    color: '#a16207',
    fillColor: '#eab308',
    radius: 7,
  },
  '4to5': {
    band: '4to5',
    label: 'M 4 – 4.9',
    color: '#c2410c',
    fillColor: '#f97316',
    radius: 9,
  },
  gte5: {
    band: 'gte5',
    label: 'M ≥ 5',
    color: '#991b1b',
    fillColor: '#ef4444',
    radius: 12,
  },
}

export function getMagnitudeBand(
  magnitude: number | null | undefined,
): MagnitudeBand {
  if (magnitude == null || !Number.isFinite(magnitude)) {
    return 'lt3'
  }
  if (magnitude >= 5) {
    return 'gte5'
  }
  if (magnitude >= 4) {
    return '4to5'
  }
  if (magnitude >= 3) {
    return '3to4'
  }
  return 'lt3'
}

export function getMagnitudeStyle(
  magnitude: number | null | undefined,
): MagnitudeStyle {
  return MAGNITUDE_STYLES[getMagnitudeBand(magnitude)]
}

export function getMagnitudeCircleOptions(
  magnitude: number | null | undefined,
): CircleMarkerOptions {
  const style = getMagnitudeStyle(magnitude)
  return {
    radius: style.radius,
    color: style.color,
    fillColor: style.fillColor,
    weight: 2,
    opacity: 0.95,
    fillOpacity: 0.72,
  }
}

export function hasValidEarthquakeCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}
