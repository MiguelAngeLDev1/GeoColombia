import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import {
  buildLocationContextUrl,
  fetchLocationContext,
} from './location'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const sampleSuccess = {
  location: { latitude: 4.4389, longitude: -75.2322 },
  territory: {
    department: { code: '73', name: 'Tolima' },
    municipality: { code: '73001', name: 'Ibagué' },
    reference_year: 2018,
  },
  weather: {
    source: 'Open-Meteo',
    timezone: 'America/Bogota',
    current: {
      temperature_c: 22,
      condition: 'Parcialmente nublado',
      is_raining: false,
    },
    today: null,
    next_hours: [],
  },
  alerts: {
    source: 'IDEAM',
    hydrological: { has_alerts: false, count: 0, alerts: [] },
    landslides: { has_alerts: false, count: 0, alerts: [] },
    fires: { has_alerts: false, count: 0, alerts: [] },
  },
  mining: { has_titles: false, count: 0, titles: [] },
  seismic: {
    radius_km: 50,
    count: 0,
    returned: 0,
    earthquakes: [],
    recent: { count: 0, returned: 0, earthquakes: [] },
  },
  unavailable_sources: [],
}

describe('location API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('construye URL y parámetros correctos', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const url = buildLocationContextUrl({
      latitude: 4.4389,
      longitude: -75.2322,
    })

    expect(url).toContain('/api/v1/location/context?')
    expect(url).toContain('latitude=4.4389')
    expect(url).toContain('longitude=-75.2322')
    expect(url).toContain('radius_km=50')
    expect(url).toContain('earthquake_limit=10')
  })

  it('valida coordenadas antes de construir la petición', () => {
    expect(() =>
      buildLocationContextUrl({
        latitude: 100,
        longitude: -75,
      }),
    ).toThrow(ApiError)
  })

  it('consulta exitosa valida el contrato', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleSuccess))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchLocationContext({
      latitude: 4.4389,
      longitude: -75.2322,
    })

    expect(result.territory?.municipality?.name).toBe('Ibagué')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('acepta respuesta parcial con unavailable_sources', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          ...sampleSuccess,
          weather: null,
          unavailable_sources: [
            {
              service: 'Open-Meteo',
              component: 'weather',
              message: 'timeout',
            },
          ],
        }),
      ),
    )

    const result = await fetchLocationContext({
      latitude: 4.4389,
      longitude: -75.2322,
    })

    expect(result.weather).toBeNull()
    expect(result.unavailable_sources).toHaveLength(1)
  })

  it('acepta secciones null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          location: { latitude: 4.4, longitude: -75.2 },
          territory: null,
          weather: null,
          alerts: null,
          mining: null,
          seismic: null,
          unavailable_sources: [],
        }),
      ),
    )

    const result = await fetchLocationContext({
      latitude: 4.4,
      longitude: -75.2,
    })

    expect(result.alerts).toBeNull()
    expect(result.territory).toBeNull()
  })

  it('propaga HTTP 422', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: 'validation error' }, 422),
      ),
    )

    await expect(
      fetchLocationContext({ latitude: 4.4, longitude: -75.2 }),
    ).rejects.toMatchObject({ kind: 'http', status: 422 })
  })

  it('propaga HTTP 502', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: 'external_service_error',
            service: 'location_context',
            message: 'All external providers failed',
          },
          502,
        ),
      ),
    )

    await expect(
      fetchLocationContext({ latitude: 4.4, longitude: -75.2 }),
    ).rejects.toMatchObject({ kind: 'http', status: 502 })
  })

  it('propaga error de red', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(
      fetchLocationContext({ latitude: 4.4, longitude: -75.2 }),
    ).rejects.toMatchObject({ kind: 'network' })
  })

  it('propaga cancelación', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    )

    await expect(
      fetchLocationContext({ latitude: 4.4, longitude: -75.2 }),
    ).rejects.toMatchObject({ kind: 'abort' })
  })

  it('rechaza payload inválido sin convertirlo en vacío', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })),
    )

    await expect(
      fetchLocationContext({ latitude: 4.4, longitude: -75.2 }),
    ).rejects.toMatchObject({ kind: 'validation' })
  })
})
