import { describe, expect, it } from 'vitest'
import {
  normalizeRecentEarthquakes,
  sortEarthquakesByDateDesc,
} from './normalizeRecentEarthquakes'

describe('normalizeRecentEarthquakes', () => {
  it('ordena por fecha descendente', () => {
    const sorted = sortEarthquakesByDateDesc([
      {
        id: 'a',
        occurred_at: '2026-10-01T00:00:00Z',
        latitude: 1,
        longitude: 1,
      },
      {
        id: 'b',
        occurred_at: '2026-10-20T00:00:00Z',
        latitude: 1,
        longitude: 1,
      },
    ])
    expect(sorted.map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('elimina duplicados por ID y coordenadas inválidas', () => {
    const result = normalizeRecentEarthquakes([
      {
        id: 'SGC1',
        latitude: 3.85,
        longitude: -75.63,
        magnitude: 3,
      },
      {
        id: 'SGC1',
        latitude: 3.86,
        longitude: -75.64,
        magnitude: 2,
      },
      {
        id: 'SGC2',
        latitude: null,
        longitude: -75.63,
        magnitude: 2,
      },
      {
        id: 'SGC3',
        latitude: 4.0,
        longitude: -75.0,
        magnitude: 2.5,
      },
    ])

    expect(result.map((item) => item.id)).toEqual(['SGC1', 'SGC3'])
  })

  it('respeta el límite máximo de marcadores', () => {
    const events = Array.from({ length: 150 }, (_, index) => ({
      id: `SGC${index}`,
      latitude: 4,
      longitude: -74,
      magnitude: 2,
    }))
    expect(normalizeRecentEarthquakes(events, 100)).toHaveLength(100)
  })
})
