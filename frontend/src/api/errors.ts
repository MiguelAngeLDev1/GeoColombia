export type ApiErrorKind =
  | 'network'
  | 'http'
  | 'validation'
  | 'abort'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  readonly body: unknown

  constructor(
    kind: ApiErrorKind,
    status: number,
    message: string,
    body: unknown = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.body = body
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof ApiError && error.kind === 'abort') {
    return true
  }

  return (
    (error instanceof DOMException || error instanceof Error) &&
    error.name === 'AbortError'
  )
}
