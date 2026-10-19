import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GEOLOCATION_ERROR_MESSAGES,
  GeolocationServiceError,
  getCurrentPosition,
  normalizeAndValidatePosition,
} from './geolocation'

function mockGeolocation(
  impl: (
    success: PositionCallback,
    error?: PositionErrorCallback | null,
  ) => void,
) {
  const getCurrentPosition = vi.fn(impl)
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  })
  return getCurrentPosition
}

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  })
})

describe('normalizeAndValidatePosition', () => {
  it('acepta coordenadas válidas dentro de Colombia', () => {
    expect(
      normalizeAndValidatePosition({
        coords: {
          latitude: 4.711,
          longitude: -74.0721,
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
      }),
    ).toEqual({
      latitude: 4.711,
      longitude: -74.0721,
      accuracy: 25,
    })
  })

  it('rechaza coordenadas inválidas', () => {
    expect(() =>
      normalizeAndValidatePosition({
        coords: {
          latitude: 200,
          longitude: -74,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
      }),
    ).toThrow(GeolocationServiceError)
  })

  it('rechaza puntos fuera de Colombia', () => {
    try {
      normalizeAndValidatePosition({
        coords: {
          latitude: 40.4,
          longitude: -3.7,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
      })
      expect.unreachable('debía lanzar')
    } catch (error) {
      expect(error).toBeInstanceOf(GeolocationServiceError)
      expect((error as GeolocationServiceError).code).toBe('outside_colombia')
    }
  })
})

describe('getCurrentPosition', () => {
  it('resuelve con coordenadas válidas', async () => {
    mockGeolocation((success) => {
      success({
        coords: {
          latitude: 4.711,
          longitude: -74.0721,
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      })
    })

    await expect(getCurrentPosition()).resolves.toEqual({
      latitude: 4.711,
      longitude: -74.0721,
      accuracy: 12,
    })
  })

  it('mapea permiso denegado', async () => {
    mockGeolocation((_success, error) => {
      error?.({
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'denied',
      } as GeolocationPositionError)
    })

    await expect(getCurrentPosition()).rejects.toMatchObject({
      code: 'permission_denied',
      message: GEOLOCATION_ERROR_MESSAGES.permission_denied,
    })
  })

  it('mapea timeout', async () => {
    mockGeolocation((_success, error) => {
      error?.({
        code: 3,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'timeout',
      } as GeolocationPositionError)
    })

    await expect(getCurrentPosition()).rejects.toMatchObject({
      code: 'timeout',
    })
  })

  it('mapea ubicación no disponible', async () => {
    mockGeolocation((_success, error) => {
      error?.({
        code: 2,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'unavailable',
      } as GeolocationPositionError)
    })

    await expect(getCurrentPosition()).rejects.toMatchObject({
      code: 'position_unavailable',
    })
  })

  it('falla si el navegador no soporta geolocalización', async () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })

    await expect(getCurrentPosition()).rejects.toMatchObject({
      code: 'unsupported',
    })
  })
})
