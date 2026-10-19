import { ApiError } from '../api/errors'

export function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
}

export function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
}

export function assertValidCoordinates(
  latitude: number,
  longitude: number,
): void {
  if (!isValidLatitude(latitude)) {
    throw new ApiError(
      'validation',
      422,
      'La latitud debe estar entre -90 y 90.',
      { field: 'latitude', value: latitude },
    )
  }

  if (!isValidLongitude(longitude)) {
    throw new ApiError(
      'validation',
      422,
      'La longitud debe estar entre -180 y 180.',
      { field: 'longitude', value: longitude },
    )
  }
}
