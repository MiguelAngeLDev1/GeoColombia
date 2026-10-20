import type { PathOptions } from 'leaflet'
import type { AlertLayerType } from '../api/alertLayerSchemas'

export type AlertNumericLevel = 1 | 2 | 3

export interface AlertLevelStyle {
  level: AlertNumericLevel
  label: string
  color: string
  fillColor: string
  fillOpacity: number
}

/** Colores por nivel IDEAM (1 amarillo, 2 naranja, 3 rojo). */
export const ALERT_LEVEL_STYLES: Record<AlertNumericLevel, AlertLevelStyle> = {
  1: {
    level: 1,
    label: 'Nivel 1 — Amarillo',
    color: '#a16207',
    fillColor: '#eab308',
    fillOpacity: 0.32,
  },
  2: {
    level: 2,
    label: 'Nivel 2 — Naranja',
    color: '#c2410c',
    fillColor: '#f97316',
    fillOpacity: 0.38,
  },
  3: {
    level: 3,
    label: 'Nivel 3 — Rojo',
    color: '#991b1b',
    fillColor: '#ef4444',
    fillOpacity: 0.42,
  },
}

/** Diferenciación visual entre capas activas a la vez. */
const LAYER_PATH_MODIFIERS: Record<
  AlertLayerType,
  Pick<PathOptions, 'dashArray' | 'weight' | 'opacity'>
> = {
  hydrological: {
    weight: 2,
    opacity: 0.95,
    dashArray: undefined,
  },
  landslides: {
    weight: 2,
    opacity: 0.9,
    dashArray: '5 4',
  },
  fires: {
    weight: 2.5,
    opacity: 0.95,
    dashArray: '1 5',
  },
}

export const ALERT_LAYER_LABELS: Record<AlertLayerType, string> = {
  hydrological: 'Alertas hidrológicas',
  landslides: 'Amenaza por deslizamientos',
  fires: 'Amenaza por incendios',
}

export function isActiveAlertLevel(
  level: number | null | undefined,
): level is AlertNumericLevel {
  return level === 1 || level === 2 || level === 3
}

export function getAlertLevelStyle(
  level: number | null | undefined,
): AlertLevelStyle | null {
  if (!isActiveAlertLevel(level)) {
    return null
  }
  return ALERT_LEVEL_STYLES[level]
}

export function getAlertLayerPathOptions(
  layerType: AlertLayerType,
  level: number | null | undefined,
): PathOptions {
  const levelStyle = getAlertLevelStyle(level)
  const modifier = LAYER_PATH_MODIFIERS[layerType]

  if (!levelStyle) {
    return {
      stroke: false,
      fill: false,
      opacity: 0,
      fillOpacity: 0,
    }
  }

  return {
    color: levelStyle.color,
    fillColor: levelStyle.fillColor,
    fillOpacity: levelStyle.fillOpacity,
    weight: modifier.weight,
    opacity: modifier.opacity,
    dashArray: modifier.dashArray,
  }
}
