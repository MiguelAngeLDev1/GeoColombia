import { useCallback, useState } from 'react'

export interface MapPoint {
  latitude: number
  longitude: number
}

export interface UseMapSelectionResult {
  selectedPoint: MapPoint | null
  selectPoint: (point: MapPoint) => void
  clearSelection: () => void
}

/**
 * Estado reutilizable de la selección cartográfica.
 * Sin lógica de presentación ni llamadas a API.
 */
export function useMapSelection(
  initialPoint: MapPoint | null = null,
): UseMapSelectionResult {
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(
    initialPoint,
  )

  const selectPoint = useCallback((point: MapPoint) => {
    setSelectedPoint({
      latitude: point.latitude,
      longitude: point.longitude,
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedPoint(null)
  }, [])

  return {
    selectedPoint,
    selectPoint,
    clearSelection,
  }
}
