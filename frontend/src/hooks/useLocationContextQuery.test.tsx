import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocationContextQuery } from './useLocationContextQuery'

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

describe('useLocationContextQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('no consulta sin selección', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useLocationContextQuery(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignora resultados obsoletos al cambiar de punto', async () => {
    let resolveFirst: ((value: Response) => void) | undefined
    let resolveSecond: ((value: Response) => void) | undefined

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('latitude=1')) {
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
      ({ point }) => useLocationContextQuery(point),
      {
        wrapper: createWrapper(),
        initialProps: {
          point: { latitude: 1, longitude: -74 } as {
            latitude: number
            longitude: number
          } | null,
        },
      },
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    rerender({ point: { latitude: 2, longitude: -75 } })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    resolveSecond?.(
      new Response(
        JSON.stringify({
          location: { latitude: 2, longitude: -75 },
          territory: null,
          weather: null,
          alerts: null,
          mining: null,
          seismic: null,
          unavailable_sources: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.location.latitude).toBe(2)

    resolveFirst?.(
      new Response(
        JSON.stringify({
          location: { latitude: 1, longitude: -74 },
          territory: null,
          weather: null,
          alerts: null,
          mining: null,
          seismic: null,
          unavailable_sources: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(result.current.data?.location.latitude).toBe(2)
  })
})
