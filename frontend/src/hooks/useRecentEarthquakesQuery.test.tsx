import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRecentEarthquakesQuery } from './useRecentEarthquakesQuery'

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  }
}

const payload = {
  source: 'Servicio Geológico Colombiano',
  count: 1,
  data: [
    {
      id: 'SGC2026uqanue',
      magnitude: 2.7,
      depth_km: 20,
      occurred_at: '2026-10-20T00:14:49Z',
      latitude: 3.86,
      longitude: -75.63,
      location: 'Chaparral - Tolima, Colombia',
      max_intensity: 2,
    },
  ],
}

describe('useRecentEarthquakesQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('no consulta mientras la capa está desactivada', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useRecentEarthquakesQuery({ enabled: false }), {
      wrapper: createWrapper(),
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('consulta el endpoint nacional con limit=100 y AbortSignal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () => useRecentEarthquakesQuery({ enabled: true, limit: 100 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/api/v1/earthquakes/recent',
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('limit=100')
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    expect(result.current.markers).toHaveLength(1)
    expect(result.current.markers[0]?.location).toMatch(/Chaparral/i)
  })

  it('maneja fallos SGC sin romper otras capas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'external_service_error',
            message: 'SGC caído',
          }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    const { result } = renderHook(
      () => useRecentEarthquakesQuery({ enabled: true }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.markers).toEqual([])
  })
})
