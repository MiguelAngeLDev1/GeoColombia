import { useCallback, useState } from 'react'
import type { AlertLayerType } from '../api/alertLayerSchemas'

export type AlertLayerToggleState = Record<AlertLayerType, boolean>

export const DEFAULT_ALERT_LAYER_TOGGLES: AlertLayerToggleState = {
  hydrological: false,
  landslides: false,
  fires: false,
}

/**
 * Estado de activación independiente por capa IDEAM.
 * Inicialmente todas desactivadas para evitar solicitudes innecesarias.
 */
export function useAlertLayerToggles(
  initial: AlertLayerToggleState = DEFAULT_ALERT_LAYER_TOGGLES,
) {
  const [enabled, setEnabled] = useState<AlertLayerToggleState>(initial)

  const setLayerEnabled = useCallback(
    (layerType: AlertLayerType, value: boolean) => {
      setEnabled((previous) => ({
        ...previous,
        [layerType]: value,
      }))
    },
    [],
  )

  const toggleLayer = useCallback((layerType: AlertLayerType) => {
    setEnabled((previous) => ({
      ...previous,
      [layerType]: !previous[layerType],
    }))
  }, [])

  const anyEnabled =
    enabled.hydrological || enabled.landslides || enabled.fires

  return {
    enabled,
    setLayerEnabled,
    toggleLayer,
    anyEnabled,
  }
}
