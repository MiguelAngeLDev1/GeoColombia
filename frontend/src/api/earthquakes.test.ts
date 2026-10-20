import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import {
  buildRecentEarthquakesUrl,
  fetchEarthquakeDetail,
  fetchRecentEarthquakes,
} from './earthquakes'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const sampleRecent = {
  source: 'Servicio Geológico Colombiano',
  count: 2,
  data: [
    {
      id: 'SGC2026newer',
      magnitude: 3.1,
      depth_km: 16,
      occurred_at: '2026-10-20T02:00:00Z',
      latitude: 3.85,
      longitude: -75.63,
      location: 'Chaparral - Tolima, Colombia',
      max_intensity: 4,
      distance_km: null,
    },
    {
      id: 'SGC2026older',
      magnitude: 2.5,
      depth_km: 10,
      occurred_at: '2026-10-19T01:00:00Z',
      latitude: 4.0,
      longitude: -75.0,
      location: 'Otro',
      max_intensity: null,
      distance_km: null,
    },
  ],
}

describe('earthquakes API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('construye URL nacional con límite acotado a 100', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(buildRecentEarthquakesUrl(50)).toContain(
      '/api/v1/earthquakes/recent',
    )
    expect(buildRecentEarthquakesUrl(50)).toContain('limit=50')
    expect(buildRecentEarthquakesUrl(500)).toContain('limit=100')
  })

  it('valida listado reciente y propaga AbortSignal', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(sampleRecent))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchRecentEarthquakes(100)
    expect(result.count).toBe(2)
    expect(result.data[0]?.id).toBe('SGC2026newer')

    const controller = new AbortController()
    controller.abort()
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      }
      return Promise.resolve(jsonResponse(sampleRecent))
    })

    await expect(
      fetchRecentEarthquakes(100, controller.signal),
    ).rejects.toMatchObject({ kind: 'abort' } satisfies Partial<ApiError>)
  })

  it('consulta detalle y propaga fallos SGC', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            source: 'Servicio Geológico Colombiano',
            data: {
              id: 'SGC2026tyyfla',
              magnitude: 3.4,
              depth_km: 16,
              occurred_at: '2026-10-10T16:48:42Z',
              latitude: 3.85,
              longitude: -75.63,
              location: 'Chaparral - Tolima, Colombia',
              reports: { count: 11, population_centers: 8 },
              felt_locations: [
                {
                  municipality: 'IBAGUÉ, TOLIMA',
                  intensity: 2,
                  reports: 2,
                  distance_km: 82.97,
                },
              ],
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(
            {
              error: 'external_service_error',
              service: 'SGC',
              message: 'SGC no disponible',
            },
            502,
          ),
        ),
    )

    const detail = await fetchEarthquakeDetail('SGC2026tyyfla')
    expect(detail.data.felt_locations[0]?.municipality).toMatch(/IBAGUÉ/i)

    await expect(fetchEarthquakeDetail('SGC2026x')).rejects.toMatchObject({
      status: 502,
    })
  })
})
