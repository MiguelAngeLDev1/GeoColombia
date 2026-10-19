import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

/** Evita altura/ancho incorrectos cuando el contenedor ya está montado. */
export function MapResizeFix() {
  const map = useMap()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize()
    })

    const onResize = () => {
      map.invalidateSize()
    }

    window.addEventListener('resize', onResize)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [map])

  return null
}
