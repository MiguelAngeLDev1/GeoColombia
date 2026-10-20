import { describe, expect, it } from 'vitest'
import {
  getMagnitudeBand,
  getMagnitudeCircleOptions,
  getMagnitudeStyle,
  hasValidEarthquakeCoordinates,
} from './earthquakeMagnitudeStyles'

describe('earthquakeMagnitudeStyles', () => {
  it('clasifica bandas por magnitud', () => {
    expect(getMagnitudeBand(2.9)).toBe('lt3')
    expect(getMagnitudeBand(3)).toBe('3to4')
    expect(getMagnitudeBand(3.9)).toBe('3to4')
    expect(getMagnitudeBand(4)).toBe('4to5')
    expect(getMagnitudeBand(4.9)).toBe('4to5')
    expect(getMagnitudeBand(5)).toBe('gte5')
  })

  it('asigna colores y radios distintos (no intensidad)', () => {
    expect(getMagnitudeStyle(2.5).fillColor).toBe('#22c55e')
    expect(getMagnitudeStyle(3.2).fillColor).toBe('#eab308')
    expect(getMagnitudeStyle(4.1).fillColor).toBe('#f97316')
    expect(getMagnitudeStyle(5.2).fillColor).toBe('#ef4444')
    expect(getMagnitudeCircleOptions(5).radius).toBeGreaterThan(
      getMagnitudeCircleOptions(2).radius ?? 0,
    )
  })

  it('valida coordenadas', () => {
    expect(hasValidEarthquakeCoordinates(3.85, -75.63)).toBe(true)
    expect(hasValidEarthquakeCoordinates(null, -75.63)).toBe(false)
    expect(hasValidEarthquakeCoordinates(91, -75)).toBe(false)
    expect(hasValidEarthquakeCoordinates(Number.NaN, -75)).toBe(false)
  })
})
