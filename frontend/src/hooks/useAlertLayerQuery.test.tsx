import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAlertLayerQuery } from './useAlertLayerQuery'

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  }
}

const okViewport = {
  west: -75.4,
  south: 4.3,
  east: -75.05,
  north: 4.55,
}

const nationalViewport = {
  west: -79,
  south: -4,
  east: -67,
  north: 13,
}

const emptyCollection = {
  type: 'FeatureCollection',
  features: [],
  source: 'IDEAM',
  layer_type: 'hydrological',
  count: 0,
  cached: false,
}

describe('useAlertLayerQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('no consulta capas desactivadas', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderHook(
      () =>
        useAlertLayerQuery({
          layerType: 'hydrological',
          enabled: false,
          viewport: okViewport,
        }),
      { wrapper: createWrapper() },
    )

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no consulta en zoom nacional (>1.5°)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () =>
        useAlertLayerQuery({
          layerType: 'landslides',
          enabled: true,
          viewport: nationalViewport,
        }),
      { wrapper: createWrapper() },
    )

    expect(result.current.eligibility.status).toBe('too_large')
    expect(result.current.canFetch).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('consulta con AbortSignal cuando el viewport es válido', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyCollection), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () =>
        useAlertLayerQuery({
          layerType: 'fires',
          enabled: true,
          viewport: okViewport,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('ignora resultados obsoletos al cambiar de región', async () => {
    let resolveFirst: ((value: Response) => void) | undefined
    let resolveSecond: ((value: Response) => void) | undefined

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('-75.4')) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve
        })
      }
      return new Promise<Response>((resolve) => {
        resolveSecond = resolve
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ viewport }) =>
        useAlertLayerQuery({
          layerType: 'hydrological',
          enabled: true,
          viewport,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { viewport: okViewport },
      },
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const secondViewport = {
      west: -74.5,
      south: 4.5,
      east: -74.2,
      north: 4.8,
    }
    rerender({ viewport: secondViewport })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    resolveSecond?.(
      new Response(
        JSON.stringify({
          ...emptyCollection,
          bbox: [-74.5, 4.5, -74.2, 4.8],
          count: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.bbox).toBe('-74.5,4.5,-74.2,4.8')

    resolveFirst?.(
      new Response(
        JSON.stringify({
          ...emptyCollection,
          features: [
            {
              type: 'Feature',
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
                object_id: 99,
                layer_type: 'hydrological',
                level: 3,
                level_key: 'red',
                level_label: 'ALERTA ROJA',
                name: 'OBSOLETO',
                source: 'IDEAM',
              },
            },
          ],
          count: 1,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(result.current.data?.features[0]?.properties.name).not.toBe(
      'OBSOLETO',
    )
  })

  it('maneja errores 413/502 de forma independiente por capa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'response_too_large',
            message: 'Demasiado grande',
          }),
          {
            status: 413,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    const { result } = renderHook(
      () =>
        useAlertLayerQuery({
          layerType: 'hydrological',
          enabled: true,
          viewport: okViewport,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ status: 413 })
  })
})
