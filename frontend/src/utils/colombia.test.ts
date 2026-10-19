import { describe, expect, it } from 'vitest'
import { isPointInColombia } from './colombia'

describe('isPointInColombia', () => {
  it('acepta puntos dentro del bbox aproximado', () => {
    expect(isPointInColombia(4.711, -74.0721)).toBe(true)
    expect(isPointInColombia(6.2442, -75.5812)).toBe(true)
  })

  it('rechaza puntos fuera de Colombia', () => {
    expect(isPointInColombia(40.4168, -3.7038)).toBe(false)
    expect(isPointInColombia(-34.6037, -58.3816)).toBe(false)
  })
})
