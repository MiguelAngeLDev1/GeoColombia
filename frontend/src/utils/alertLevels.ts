import type { AlertLevel } from '../types/location'

export interface AlertLevelPresentation {
  level: AlertLevel
  label: string
  shortLabel: string
  className: string
}

const ALERT_LEVELS: Record<AlertLevel, Omit<AlertLevelPresentation, 'level'>> =
  {
    yellow: {
      label: 'Nivel amarillo',
      shortLabel: 'Amarillo',
      className:
        'border-yellow-400/50 bg-yellow-400/15 text-yellow-100',
    },
    orange: {
      label: 'Nivel naranja',
      shortLabel: 'Naranja',
      className: 'border-orange-400/50 bg-orange-400/15 text-orange-100',
    },
    red: {
      label: 'Nivel rojo',
      shortLabel: 'Rojo',
      className: 'border-red-400/50 bg-red-400/20 text-red-100',
    },
    unknown: {
      label: 'Nivel desconocido',
      shortLabel: 'Desconocido',
      className: 'border-white/20 bg-white/10 text-geo-mist',
    },
  }

export function getAlertLevelPresentation(
  level: AlertLevel | string | null | undefined,
): AlertLevelPresentation {
  const normalized =
    level === 'yellow' ||
    level === 'orange' ||
    level === 'red' ||
    level === 'unknown'
      ? level
      : 'unknown'

  return {
    level: normalized,
    ...ALERT_LEVELS[normalized],
  }
}
