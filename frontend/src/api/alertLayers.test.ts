import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import {
  buildAlertLayerUrl,
  fetchAlertLayer,
} from './alertLayers'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const sampleFeature = {
  type: 'Feature',
  id: 'hydrological-1',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-75.3, 4.4],
        [-75.2, 4.4],
        [-75.2, 4.5],
        [-75.3, 4.5],
        [-75.3, 4.4],
      ],
    ],
  },
  properties: {
    object_id: 1,
    layer_type: 'hydrological',
    level: 2,
    level_key: 'orange',
    level_label: 'ALERTA NARANJA',
    name: 'Río Coello',
    source: 'IDEAM',
    department: 'TOLIMA',
    hydrographic_subzone_code: 2121,
  },
}

const sampleCollection = {
  type: 'FeatureCollection',
  features: [sampleFeature],
  source: 'IDEAM',
  layer_type: 'hydrological',
  bbox: [-75.4, 4.3, -75.05, 4.55],
  min_level: 1,
  count: 1,
  cached: false,
}

describe('alertLayers API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('construye URL con bbox y min_level', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const url = buildAlertLayerUrl({
      layerType: 'hydrological',
      bbox: '-75.4,4.3,-75.05,4.55',
      minLevel: 2,
    })
    expect(url).toContain('/api/v1/alerts/layers/hydrological')
    expect(url).toContain('bbox=-75.4%2C4.3%2C-75.05%2C4.55')
    expect(url).toContain('min_level=2')
  })

  it('valida FeatureCollection y Polygon', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(sampleCollection)),
    )

    const result = await fetchAlertLayer({
      layerType: 'hydrological',
      bbox: '-75.4,4.3,-75.05,4.55',
    })

    expect(result.features).toHaveLength(1)
    expect(result.features[0]?.geometry.type).toBe('Polygon')
  })

  it('acepta MultiPolygon', async () => {
    const multi = {
      ...sampleCollection,
      features: [
        {
          ...sampleFeature,
          geometry: {
            type: 'MultiPolygon',
            coordinates: [sampleFeature.geometry.coordinates],
          },
        },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(multi)))

    const result = await fetchAlertLayer({
      layerType: 'hydrological',
      bbox: '-75.4,4.3,-75.05,4.55',
    })
    expect(result.features[0]?.geometry.type).toBe('MultiPolygon')
  })

  it('propaga AbortSignal y errores 413/502', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: 'response_too_large', message: 'Demasiado grande' },
          413,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: 'external_service_error',
            service: 'IDEAM',
            message: 'Fallo IDEAM',
          },
          502,
        ),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchAlertLayer({
        layerType: 'fires',
        bbox: '-75.4,4.3,-75.05,4.55',
      }),
    ).rejects.toMatchObject({ status: 413 } satisfies Partial<ApiError>)

    await expect(
      fetchAlertLayer({
        layerType: 'fires',
        bbox: '-75.4,4.3,-75.05,4.55',
      }),
    ).rejects.toMatchObject({ status: 502 } satisfies Partial<ApiError>)

    const controller = new AbortController()
    controller.abort()
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      }
      return Promise.resolve(jsonResponse(sampleCollection))
    })

    await expect(
      fetchAlertLayer(
        { layerType: 'landslides', bbox: '-75.4,4.3,-75.05,4.55' },
        controller.signal,
      ),
    ).rejects.toMatchObject({ kind: 'abort' })
  })
})
