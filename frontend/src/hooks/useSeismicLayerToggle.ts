import { useCallback, useState } from 'react'

/** Toggle de la capa nacional de sismos (off por defecto). */
export function useSeismicLayerToggle(initial = false) {
  const [enabled, setEnabled] = useState(initial)

  const toggle = useCallback(() => {
    setEnabled((previous) => !previous)
  }, [])

  const setLayerEnabled = useCallback((value: boolean) => {
    setEnabled(value)
  }, [])

  return {
    enabled,
    toggle,
    setLayerEnabled,
  }
}
