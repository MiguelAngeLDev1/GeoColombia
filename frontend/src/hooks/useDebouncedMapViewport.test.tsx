import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const listeners: Record<string, Array<() => void>> = {
  moveend: [],
  zoomend: [],
}

const mapMock = {
  getBounds: () => ({
    getWest: () => -75.4,
    getSouth: () => 4.3,
    getEast: () => -75.05,
    getNorth: () => 4.55,
  }),
  on: (event: string, handler: () => void) => {
    listeners[event]?.push(handler)
  },
  off: (event: string, handler: () => void) => {
    listeners[event] = (listeners[event] ?? []).filter((item) => item !== handler)
  },
}

vi.mock('react-leaflet', () => ({
  useMap: () => mapMock,
}))

import { useDebouncedMapViewport } from './useDebouncedMapViewport'

describe('useDebouncedMapViewport', () => {
  beforeEach(() => {
    listeners.moveend = []
    listeners.zoomend = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emite viewport inicial y aplica debounce en moveend', () => {
    const { result } = renderHook(() => useDebouncedMapViewport(300))

    expect(result.current).toEqual({
      west: -75.4,
      south: 4.3,
      east: -75.05,
      north: 4.55,
    })

    mapMock.getBounds = () => ({
      getWest: () => -74.5,
      getSouth: () => 4.5,
      getEast: () => -74.2,
      getNorth: () => 4.8,
    })

    act(() => {
      listeners.moveend.forEach((handler) => handler())
    })

    expect(result.current?.west).toBe(-75.4)

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current?.west).toBe(-75.4)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toEqual({
      west: -74.5,
      south: 4.5,
      east: -74.2,
      north: 4.8,
    })
  })
})
