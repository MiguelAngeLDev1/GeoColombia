export function formatTemperatureC(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `${formatNumber(value, 1)} °C`
}

export function formatPercent(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `${Math.round(value)} %`
}

export function formatSpeedKmh(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `${formatNumber(value, 1)} km/h`
}

export function formatPrecipitationMm(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `${formatNumber(value, 1)} mm`
}

export function formatDistanceKm(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `${formatNumber(value, 1)} km`
}

export function formatDepthKm(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `${formatNumber(value, 1)} km`
}

export function formatMagnitude(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `M ${formatNumber(value, 1)}`
}

export function formatAreaKm2(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `${formatNumber(value, 2)} km²`
}

export function formatAreaHa(
  value: number | null | undefined,
): string | null {
  if (value == null || Number.isNaN(value)) {
    return null
  }

  return `${formatNumber(value, 2)} ha`
}

function formatNumber(value: number, digits: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)
}
