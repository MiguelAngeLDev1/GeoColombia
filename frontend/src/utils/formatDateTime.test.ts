import { describe, expect, it } from 'vitest'
import { formatDateTime, formatHourLabel } from './formatDateTime'

describe('formatDateTime', () => {
  it('formatea fechas ISO en español colombiano compacto', () => {
    const formatted = formatDateTime(
      '2024-06-15T19:30:00.000Z',
      'America/Bogota',
    )
    expect(formatted).toBeTruthy()
    expect(formatted).not.toMatch(/\.\.\./)
    expect(formatted).toMatch(/2024/)
    expect(formatted).toMatch(/14:30|15:30|19:30/)
  })

  it('formatea hora en 24h compacta', () => {
    const hour = formatHourLabel(
      '2024-06-15T16:00:00-05:00',
      'America/Bogota',
    )
    expect(hour).toMatch(/^\d{2}:\d{2}$/)
  })

  it('devuelve null para valores inválidos', () => {
    expect(formatDateTime(null)).toBeNull()
    expect(formatDateTime('no-es-fecha')).toBeNull()
    expect(formatHourLabel(undefined)).toBeNull()
  })
})
