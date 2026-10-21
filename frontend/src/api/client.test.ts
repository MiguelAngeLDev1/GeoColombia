import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApiUrl, getApiBaseUrl } from './client'

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('usa cadena vacía cuando VITE_API_BASE_URL no está definida', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(getApiBaseUrl()).toBe('')
    expect(buildApiUrl('/api/v1/location/context')).toBe(
      '/api/v1/location/context',
    )
  })

  it('elimina la barra final de la base URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/')
    vi.stubEnv('PROD', false)
    expect(getApiBaseUrl()).toBe('http://localhost:8000')
    expect(buildApiUrl('api/v1/weather')).toBe(
      'http://localhost:8000/api/v1/weather',
    )
  })

  it('en producción exige HTTPS en VITE_API_BASE_URL', () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.ejemplo.com')
    expect(() => getApiBaseUrl()).toThrow(/HTTPS/i)
  })

  it('en producción acepta HTTPS absoluto', () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.ejemplo.com/')
    expect(getApiBaseUrl()).toBe('https://api.ejemplo.com')
    expect(buildApiUrl('/api/v1/location/context')).toBe(
      'https://api.ejemplo.com/api/v1/location/context',
    )
  })
})
