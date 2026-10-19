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
    expect(getApiBaseUrl()).toBe('http://localhost:8000')
    expect(buildApiUrl('api/v1/weather')).toBe(
      'http://localhost:8000/api/v1/weather',
    )
  })
})
