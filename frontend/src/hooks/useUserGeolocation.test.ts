import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as geolocationService from '../services/geolocation'
import { useUserGeolocation } from './useUserGeolocation'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useUserGeolocation', () => {
  it('devuelve el punto en un flujo exitoso', async () => {
    vi.spyOn(geolocationService, 'getCurrentPosition').mockResolvedValue({
      latitude: 4.711,
      longitude: -74.0721,
      accuracy: 20,
    })

    const { result } = renderHook(() => useUserGeolocation())

    let point: { latitude: number; longitude: number } | null = null
    await act(async () => {
      point = await result.current.requestCurrentLocation()
    })

    expect(point).toEqual({ latitude: 4.711, longitude: -74.0721 })
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('expone error cuando el permiso es denegado', async () => {
    vi.spyOn(geolocationService, 'getCurrentPosition').mockRejectedValue(
      new geolocationService.GeolocationServiceError('permission_denied'),
    )

    const { result } = renderHook(() => useUserGeolocation())

    await act(async () => {
      await result.current.requestCurrentLocation()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error?.code).toBe('permission_denied')
  })

  it('ignora una respuesta tardía tras invalidatePending', async () => {
    let resolvePosition!: (
      value: geolocationService.GeolocationCoords,
    ) => void

    vi.spyOn(geolocationService, 'getCurrentPosition').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePosition = resolve
        }),
    )

    const { result } = renderHook(() => useUserGeolocation())

    let pendingPromise: Promise<{ latitude: number; longitude: number } | null>
    act(() => {
      pendingPromise = result.current.requestCurrentLocation()
    })

    expect(result.current.isPending).toBe(true)

    act(() => {
      result.current.invalidatePending()
    })

    await act(async () => {
      resolvePosition({
        latitude: 4.711,
        longitude: -74.0721,
        accuracy: 15,
      })
      await pendingPromise
    })

    expect(await pendingPromise!).toBeNull()
    expect(result.current.status).not.toBe('pending')
    expect(result.current.error).toBeNull()
  })

  it('ignora un error tardío tras selección manual', async () => {
    let rejectPosition!: (reason?: unknown) => void

    vi.spyOn(geolocationService, 'getCurrentPosition').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectPosition = reject
        }),
    )

    const { result } = renderHook(() => useUserGeolocation())

    let pendingPromise: Promise<{ latitude: number; longitude: number } | null>
    act(() => {
      pendingPromise = result.current.requestCurrentLocation()
    })

    act(() => {
      result.current.invalidatePending()
    })

    await act(async () => {
      rejectPosition(
        new geolocationService.GeolocationServiceError('timeout'),
      )
      await pendingPromise
    })

    expect(await pendingPromise!).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
