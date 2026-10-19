/**
 * Contratos alineados con LocationContextResponse del backend.
 * Se ampliarán conforme se integren las secciones en fases posteriores.
 */

export interface LocationCoordinates {
  latitude: number
  longitude: number
}

export interface UnavailableSource {
  service: string
  component: string
  message: string
}

export interface Department {
  code: string
  name: string
}

export interface Municipality {
  code: string
  name: string
  type?: string | null
  area_km2?: number | null
}

export interface TerritoryContext {
  department?: Department | null
  municipality?: Municipality | null
  reference_year?: number | null
}

export type AlertLevel = 'yellow' | 'orange' | 'red' | 'unknown'

export type SectionUiState =
  | 'idle'
  | 'loading'
  | 'available'
  | 'empty_ok'
  | 'source_unavailable'
  | 'error'
