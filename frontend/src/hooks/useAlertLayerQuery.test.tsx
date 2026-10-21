import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  alertLayerDataMatchesMode,
  alertLayerQueryKey,
  useAlertLayerQuery,
} from './useAlertLayerQuery'

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

const emptyRegional = {
  type: 'FeatureCollection',
  features: [],
  source: 'IDEAM',
  layer_type: 'hydrological',
  count: 0,
  cached: false,
}

const emptyNational = {
  ...emptyRegional,
  mode: 'national',
  max_allowable_offset: 0.05,
  max_allowable_offset_unit: 'degrees_wgs84',
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

  it('consulta endpoint nacional sin bbox cuando span > 1.5°', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyNational), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
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

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.activeMode).toBe('national')
    expect(result.current.canFetch).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/api/v1/alerts/layers/landslides/national')
    expect(url).not.toContain('bbox=')
  })

  it('consulta endpoint regional con bbox cuando span ≤ 1.5°', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyRegional), {
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
    expect(result.current.activeMode).toBe('regional')
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/api/v1/alerts/layers/fires?')
    expect(url).toContain('bbox=')
    expect(url).not.toContain('/national')
  })

  it('consulta con AbortSignal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyRegional), {
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
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('transición nacional → regional cambia endpoint y query key', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const national = String(url).includes('/national')
      return Promise.resolve(
        new Response(
          JSON.stringify(national ? emptyNational : emptyRegional),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
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
        initialProps: { viewport: nationalViewport },
      },
    )

    await waitFor(() => expect(result.current.activeMode).toBe('national'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.mode).toBe('national')

    rerender({ viewport: okViewport })

    await waitFor(() => expect(result.current.activeMode).toBe('regional'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.mode).toBeUndefined()
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/national'))).toBe(
      true,
    )
    expect(
      fetchMock.mock.calls.some(
        (c) =>
          String(c[0]).includes('bbox=') && !String(c[0]).includes('/national'),
      ),
    ).toBe(true)
  })

  it('transición regional → nacional no mezcla geometrías', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const national = String(url).includes('/national')
      return Promise.resolve(
        new Response(
          JSON.stringify(national ? emptyNational : emptyRegional),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
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

    await waitFor(() => expect(result.current.activeMode).toBe('regional'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ viewport: nationalViewport })

    await waitFor(() => expect(result.current.activeMode).toBe('national'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.mode).toBe('national')
    expect(
      alertLayerDataMatchesMode(result.current.data, 'national'),
    ).toBe(true)
    expect(
      alertLayerDataMatchesMode(result.current.data, 'regional'),
    ).toBe(false)
  })

  it('usa query keys independientes por modo', () => {
    expect(alertLayerQueryKey('fires', 'national', 'national', 1)).not.toEqual(
      alertLayerQueryKey('fires', 'regional', '-75.4,4.3,-75.05,4.55', 1),
    )
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
          ...emptyRegional,
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
          ...emptyRegional,
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

  it('maneja errores 413/422/502 de forma independiente', async () => {
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

  it('acepta capa vacía nacional', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(emptyNational), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const { result } = renderHook(
      () =>
        useAlertLayerQuery({
          layerType: 'fires',
          enabled: true,
          viewport: nationalViewport,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.features).toEqual([])
  })
})
