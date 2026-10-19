/**
 * Cliente HTTP base para la API GeoColombia.
 * Las consultas a endpoints se añadirán en fases posteriores.
 */

const trimTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, '')

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!configured) {
    return ''
  }

  return trimTrailingSlash(configured)
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = getApiBaseUrl()

  return `${baseUrl}${normalizedPath}`
}
