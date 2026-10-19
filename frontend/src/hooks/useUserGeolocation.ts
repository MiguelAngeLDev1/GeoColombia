import { useCallback, useRef, useState } from 'react'
import {
  geolocationErrorMessage,
  getCurrentPosition,
  isGeolocationServiceError,
  type GeolocationErrorCode,
} from '../services/geolocation'
import type { MapPoint } from './useMapSelection'

export type UserGeolocationStatus = 'idle' | 'pending' | 'error'

export interface UserGeolocationError {
  code: GeolocationErrorCode
  message: string
}

export interface UseUserGeolocationResult {
  status: UserGeolocationStatus
  error: UserGeolocationError | null
  isPending: boolean
  /** Solicita una lectura puntual tras gesto explícito del usuario. */
  requestCurrentLocation: () => Promise<MapPoint | null>
  /**
   * Invalida cualquier respuesta pendiente (p. ej. tras selección manual)
   * para que una geolocalización tardía no sobrescriba el punto actual.
   */
  invalidatePending: () => void
  clearError: () => void
}

/**
 * Geolocalización bajo demanda, sin seguimiento ni almacenamiento.
 * Protege la selección manual frente a respuestas tardías.
 */
export function useUserGeolocation(): UseUserGeolocationResult {
  const requestIdRef = useRef(0)
  const [status, setStatus] = useState<UserGeolocationStatus>('idle')
  const [error, setError] = useState<UserGeolocationError | null>(null)

  const invalidatePending = useCallback(() => {
    requestIdRef.current += 1
    setStatus((current) => (current === 'pending' ? 'idle' : current))
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setStatus((current) => (current === 'error' ? 'idle' : current))
  }, [])

  const requestCurrentLocation =
    useCallback(async (): Promise<MapPoint | null> => {
      const requestId = ++requestIdRef.current
      setStatus('pending')
      setError(null)

      try {
        const coords = await getCurrentPosition()

        if (requestId !== requestIdRef.current) {
          return null
        }

        setStatus('idle')
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }
      } catch (caught) {
        if (requestId !== requestIdRef.current) {
          return null
        }

        const code = isGeolocationServiceError(caught)
          ? caught.code
          : 'position_unavailable'

        setStatus('error')
        setError({
          code,
          message: geolocationErrorMessage(caught),
        })
        return null
      }
    }, [])

  return {
    status,
    error,
    isPending: status === 'pending',
    requestCurrentLocation,
    invalidatePending,
    clearError,
  }
}
