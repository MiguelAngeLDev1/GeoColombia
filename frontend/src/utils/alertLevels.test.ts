import { describe, expect, it } from 'vitest'
import { getAlertLevelPresentation } from './alertLevels'

describe('getAlertLevelPresentation', () => {
  it('mapea niveles conocidos con etiqueta textual', () => {
    expect(getAlertLevelPresentation('yellow').label).toMatch(/amarillo/i)
    expect(getAlertLevelPresentation('orange').shortLabel).toBe('Naranja')
    expect(getAlertLevelPresentation('red').label).toMatch(/rojo/i)
  })

  it('trata niveles desconocidos sin inventar datos', () => {
    expect(getAlertLevelPresentation('purple').level).toBe('unknown')
    expect(getAlertLevelPresentation(null).label).toMatch(/desconocido/i)
  })
})
