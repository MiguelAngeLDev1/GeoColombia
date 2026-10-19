import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/errors'
import {
  assertValidCoordinates,
  isValidLatitude,
  isValidLongitude,
} from './validateCoordinates'

describe('validateCoordinates', () => {
  it('acepta coordenadas válidas', () => {
    expect(isValidLatitude(4.4389)).toBe(true)
    expect(isValidLongitude(-75.2322)).toBe(true)
    expect(() => assertValidCoordinates(4.4389, -75.2322)).not.toThrow()
  })

  it('rechaza latitud fuera de rango', () => {
    expect(isValidLatitude(91)).toBe(false)
    expect(() => assertValidCoordinates(91, -75)).toThrow(ApiError)
  })

  it('rechaza longitud fuera de rango', () => {
    expect(isValidLongitude(-181)).toBe(false)
    expect(() => assertValidCoordinates(4, -181)).toThrow(ApiError)
  })
})
