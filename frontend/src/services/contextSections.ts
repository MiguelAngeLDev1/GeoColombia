import type {
  AlertsContext,
  LocationContextResponse,
  SectionUiState,
  SeismicContext,
  TerritoryContext,
  UnavailableSource,
  WeatherContext,
} from '../types/location'
import {
  findUnavailableSource,
  formatUnavailableLabel,
  resolveSectionState,
} from './sectionState'

export function resolveTerritorySection(
  territory: TerritoryContext | null | undefined,
  unavailableSources: UnavailableSource[],
): SectionUiState {
  return resolveSectionState({
    sectionPresent: territory != null,
    isEmptyOk:
      territory != null &&
      territory.municipality == null &&
      territory.department == null,
    unavailableSources,
    component: 'territory',
  })
}

export function resolveWeatherSection(
  weather: WeatherContext | null | undefined,
  unavailableSources: UnavailableSource[],
): SectionUiState {
  return resolveSectionState({
    sectionPresent: weather != null,
    isEmptyOk: false,
    unavailableSources,
    component: 'weather',
  })
}

export function resolveNearbySeismicSection(
  seismic: SeismicContext | null | undefined,
  unavailableSources: UnavailableSource[],
): SectionUiState {
  const nearbyUnavailable = unavailableSources.some(
    (item) => item.component === 'nearby_earthquakes',
  )

  if (nearbyUnavailable || seismic == null) {
    return resolveSectionState({
      sectionPresent: seismic != null && !nearbyUnavailable,
      isEmptyOk: false,
      unavailableSources,
      component: 'nearby_earthquakes',
    })
  }

  return resolveSectionState({
    sectionPresent: true,
    isEmptyOk: seismic.count === 0,
    unavailableSources,
    component: 'nearby_earthquakes',
  })
}

export function resolveRecentSeismicSection(
  seismic: SeismicContext | null | undefined,
  unavailableSources: UnavailableSource[],
): SectionUiState {
  const recentUnavailable = unavailableSources.some(
    (item) => item.component === 'recent_earthquakes',
  )

  if (recentUnavailable || seismic == null) {
    return resolveSectionState({
      sectionPresent: seismic != null && !recentUnavailable,
      isEmptyOk: false,
      unavailableSources,
      component: 'recent_earthquakes',
    })
  }

  return resolveSectionState({
    sectionPresent: true,
    isEmptyOk: seismic.recent.count === 0,
    unavailableSources,
    component: 'recent_earthquakes',
  })
}

export function resolveAlertBucketSection(
  alerts: AlertsContext | null | undefined,
  bucket: 'hydrological' | 'landslides' | 'fires',
  component:
    | 'hydrological_alerts'
    | 'landslide_alerts'
    | 'fire_alerts',
  unavailableSources: UnavailableSource[],
): SectionUiState {
  const data = alerts?.[bucket] ?? null

  return resolveSectionState({
    sectionPresent: alerts != null && data != null,
    isEmptyOk: data != null && (!data.has_alerts || data.count === 0),
    unavailableSources,
    component,
  })
}

export function unavailableMessageFor(
  unavailableSources: UnavailableSource[],
  component: string,
): string {
  const source = findUnavailableSource(unavailableSources, component)
  return source
    ? formatUnavailableLabel(source)
    : 'Fuente temporalmente no disponible'
}

export function buildLocationHeadline(
  data: LocationContextResponse,
): string {
  const parts = [
    data.territory?.municipality?.name,
    data.territory?.department?.name,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'Coordenadas consultadas'
}
