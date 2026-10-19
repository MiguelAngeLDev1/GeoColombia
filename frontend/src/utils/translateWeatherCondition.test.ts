import { describe, expect, it } from 'vitest'
import {
  UNKNOWN_CONDITION_FALLBACK,
  translateWeatherCondition,
} from './translateWeatherCondition'

describe('translateWeatherCondition', () => {
  it('traduce condiciones conocidas del backend', () => {
    expect(translateWeatherCondition('Partly cloudy')).toBe(
      'Parcialmente nublado',
    )
    expect(translateWeatherCondition('Overcast')).toBe('Nublado')
    expect(translateWeatherCondition('Clear sky')).toBe('Cielo despejado')
    expect(translateWeatherCondition('Thunderstorm')).toBe('Tormenta')
  })

  it('es insensible a mayúsculas y conserva español existente', () => {
    expect(translateWeatherCondition('PARTLY CLOUDY')).toBe(
      'Parcialmente nublado',
    )
    expect(translateWeatherCondition('Nublado')).toBe('Nublado')
  })

  it('usa fallback claro para valores desconocidos en inglés', () => {
    expect(translateWeatherCondition('Mysterious haze')).toBe(
      UNKNOWN_CONDITION_FALLBACK,
    )
  })

  it('devuelve null para valores vacíos', () => {
    expect(translateWeatherCondition(null)).toBeNull()
    expect(translateWeatherCondition('   ')).toBeNull()
  })
})
