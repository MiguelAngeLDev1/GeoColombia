import { ApiError, isAbortError } from './errors'

const trimTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, '')

/**
 * Base URL de la API.
 *
 * - Desarrollo: cadena vacía → rutas relativas `/api/...` (proxy Vite).
 * - Producción (build): VITE_API_BASE_URL debe ser HTTPS absoluto
 *   (p. ej. https://api.ejemplo.com), sin barra final.
 */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!configured) {
    return ''
  }

  const base = trimTrailingSlash(configured)

  if (import.meta.env.PROD) {
    if (!/^https:\/\//i.test(base)) {
      throw new Error(
        'VITE_API_BASE_URL debe usar HTTPS en producción ' +
          '(ejemplo: https://api.ejemplo.com).',
      )
    }
  }

  return base
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = getApiBaseUrl()

  return `${baseUrl}${normalizedPath}`
}

export function buildApiUrlWithSearch(
  path: string,
  searchParams: URLSearchParams,
): string {
  const query = searchParams.toString()
  const url = buildApiUrl(path)

  return query ? `${url}?${query}` : url
}

interface FetchJsonOptions extends Omit<RequestInit, 'signal'> {
  signal?: AbortSignal
}

/**
 * fetch tipado con errores de red/HTTP y soporte AbortSignal.
 */
export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  let response: Response

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiError('abort', 0, 'Consulta cancelada')
    }

    throw new ApiError(
      'network',
      0,
      'No fue posible conectar con la API de GeoColombia.',
      error,
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : `Error HTTP ${response.status}`

    throw new ApiError('http', response.status, message, body)
  }

  return body as T
}
