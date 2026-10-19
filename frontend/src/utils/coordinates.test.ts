import { describe, expect, it } from 'vitest'
import {
  formatLatitude,
  formatLongitude,
  formatMapPoint,
} from './coordinates'

describe('coordinates', () => {
  it('formatea latitud y longitud con hemisferio', () => {
    expect(formatLatitude(4.711)).toBe('4.71100° N')
    expect(formatLongitude(-74.0721)).toBe('74.07210° O')
  })

  it('formatea un punto completo', () => {
    expect(
      formatMapPoint({
        latitude: -1.2,
        longitude: 70.5,
      }),
    ).toEqual({
      latitude: '1.20000° S',
      longitude: '70.50000° E',
    })
  })
})
