import { isPointInColombia } from '../utils/colombia'
import {
  isValidLatitude,
  isValidLongitude,
} from '../utils/validateCoordinates'

export type GeolocationErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'invalid_coords'
  | 'outside_colombia'

export const GEOLOCATION_ERROR_MESSAGES: Record<GeolocationErrorCode, string> =
  {
    unsupported:
      'Tu navegador no admite geolocalización. Selecciona un punto en el mapa.',
    permission_denied:
      'No se pudo obtener la ubicación: permiso denegado. Puedes elegir un punto en el mapa.',
    position_unavailable:
      'No se pudo obtener la ubicación en este momento. Intenta de nuevo o selecciona un punto en el mapa.',
    timeout:
      'La solicitud de ubicación agotó el tiempo de espera. Intenta de nuevo o selecciona un punto en el mapa.',
    invalid_coords:
      'La posición recibida no es válida. Selecciona un punto en el mapa.',
    outside_colombia:
      'Tu ubicación parece estar fuera de Colombia. Selecciona un punto dentro del territorio en el mapa.',
  }

export class GeolocationServiceError extends Error {
  readonly code: GeolocationErrorCode

  constructor(code: GeolocationErrorCode, message?: string) {
    super(message ?? GEOLOCATION_ERROR_MESSAGES[code])
    this.name = 'GeolocationServiceError'
    this.code = code
  }
}

export interface GeolocationCoords {
  latitude: number
  longitude: number
  accuracy: number | null
}

export interface GetCurrentPositionOptions {
  /** Tiempo máximo de espera del navegador (ms). */
  timeoutMs?: number
  /** Edad máxima aceptable de una lectura en caché (ms). */
  maximumAgeMs?: number
  enableHighAccuracy?: boolean
}

const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_MAXIMUM_AGE_MS = 0

type GeolocationLike = {
  getCurrentPosition: (
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions,
  ) => void
}

function resolveGeolocationApi(): GeolocationLike | null {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null
  }
  return navigator.geolocation
}

function mapBrowserError(error: GeolocationPositionError): GeolocationServiceError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new GeolocationServiceError('permission_denied')
    case error.TIMEOUT:
      return new GeolocationServiceError('timeout')
    case error.POSITION_UNAVAILABLE:
    default:
      return new GeolocationServiceError('position_unavailable')
  }
}

/**
 * Obtiene una lectura puntual de geolocalización del navegador.
 * No hace seguimiento continuo ni persiste coordenadas.
 */
export function getCurrentPosition(
  options: GetCurrentPositionOptions = {},
): Promise<GeolocationCoords> {
  const api = resolveGeolocationApi()
  if (!api) {
    return Promise.reject(new GeolocationServiceError('unsupported'))
  }

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maximumAgeMs = DEFAULT_MAXIMUM_AGE_MS,
    enableHighAccuracy = true,
  } = options

  return new Promise((resolve, reject) => {
    api.getCurrentPosition(
      (position) => {
        try {
          resolve(normalizeAndValidatePosition(position))
        } catch (error) {
          reject(error)
        }
      },
      (error) => {
        reject(mapBrowserError(error))
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      },
    )
  })
}

/** Valida coordenadas y exige que estén dentro del bbox de Colombia. */
export function normalizeAndValidatePosition(
  position: Pick<GeolocationPosition, 'coords'>,
): GeolocationCoords {
  const latitude = position.coords.latitude
  const longitude = position.coords.longitude
  const accuracy =
    typeof position.coords.accuracy === 'number' &&
    Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : null

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    throw new GeolocationServiceError('invalid_coords')
  }

  if (!isPointInColombia(latitude, longitude)) {
    throw new GeolocationServiceError('outside_colombia')
  }

  return { latitude, longitude, accuracy }
}

export function isGeolocationServiceError(
  error: unknown,
): error is GeolocationServiceError {
  return error instanceof GeolocationServiceError
}

export function geolocationErrorMessage(error: unknown): string {
  if (isGeolocationServiceError(error)) {
    return error.message
  }
  return GEOLOCATION_ERROR_MESSAGES.position_unavailable
}
