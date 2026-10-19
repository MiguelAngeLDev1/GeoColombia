import { describe, expect, it } from 'vitest'
import {
  formatAreaHa,
  formatDepthKm,
  formatDistanceKm,
  formatMagnitude,
  formatPercent,
  formatPrecipitationMm,
  formatSpeedKmh,
  formatTemperatureC,
} from './formatUnits'

describe('formatUnits', () => {
  it('formatea unidades climáticas y sísmicas', () => {
    expect(formatTemperatureC(22.46)).toContain('°C')
    expect(formatPercent(61.2)).toBe('61 %')
    expect(formatSpeedKmh(12.3)).toContain('km/h')
    expect(formatPrecipitationMm(1.25)).toContain('mm')
    expect(formatDistanceKm(4.2)).toContain('km')
    expect(formatDepthKm(33)).toContain('km')
    expect(formatMagnitude(4.5)).toMatch(/^M 4[,.]5$/)
    expect(formatAreaHa(12.5)).toContain('ha')
  })

  it('devuelve null cuando falta el valor', () => {
    expect(formatTemperatureC(null)).toBeNull()
    expect(formatMagnitude(undefined)).toBeNull()
  })
})
