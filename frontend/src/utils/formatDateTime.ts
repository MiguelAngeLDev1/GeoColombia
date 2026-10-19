/**
 * Formatea fechas/horas del backend en español colombiano.
 * Acepta timeZone IANA cuando la API la proporciona (p. ej. America/Bogota).
 */

function parseDate(value: string): Date | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

function buildOptions(
  timeZone?: string | null,
  extra: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormatOptions {
  return {
    ...extra,
    ...(timeZone ? { timeZone } : {}),
  }
}

/** Fecha y hora compactas: 18 oct 2026, 22:45 */
export function formatDateTime(
  value: string | null | undefined,
  timeZone?: string | null,
): string | null {
  if (!value) {
    return null
  }

  const date = parseDate(value)
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat(
    'es-CO',
    buildOptions(timeZone, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  ).format(date)
}

/** Solo hora compacta: 22:45 (sin saltos por a. m./p. m.) */
export function formatHourLabel(
  value: string | null | undefined,
  timeZone?: string | null,
): string | null {
  if (!value) {
    return null
  }

  const date = parseDate(value)
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat(
    'es-CO',
    buildOptions(timeZone, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  ).format(date)
}
