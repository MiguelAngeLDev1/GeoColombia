/** Centro aproximado y encuadre inicial para el mapa de Colombia. */

export const COLOMBIA_MAP_CENTER = {
  latitude: 4.5709,
  longitude: -74.2973,
} as const

export const COLOMBIA_DEFAULT_ZOOM = 6

/** Zoom al centrar tras geolocalización exitosa. */
export const COLOMBIA_USER_LOCATION_ZOOM = 12

export const COLOMBIA_BOUNDS = {
  south: -4.3,
  west: -82.0,
  north: 13.5,
  east: -66.8,
} as const

/** Bounding box aproximado continental + islas cercanas (no es un polígono oficial). */
export function isPointInColombia(latitude: number, longitude: number): boolean {
  return (
    latitude >= COLOMBIA_BOUNDS.south &&
    latitude <= COLOMBIA_BOUNDS.north &&
    longitude >= COLOMBIA_BOUNDS.west &&
    longitude <= COLOMBIA_BOUNDS.east
  )
}
