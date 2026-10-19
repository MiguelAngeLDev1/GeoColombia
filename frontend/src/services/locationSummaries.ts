import type {
  LocationContextResponse,
  SectionUiState,
  UnavailableSource,
} from '../types/location'
import {
  findUnavailableSource,
  formatUnavailableLabel,
  resolveSectionState,
} from './sectionState'

export interface SectionSummary {
  id: string
  label: string
  state: Exclude<SectionUiState, 'idle' | 'loading' | 'error'>
  detail: string
}

function unavailableDetail(
  unavailableSources: UnavailableSource[],
  component: string,
): string {
  const source = findUnavailableSource(unavailableSources, component)
  return source
    ? formatUnavailableLabel(source)
    : 'Fuente temporalmente no disponible'
}

/**
 * Resume cada sección del contexto para el panel de la Fase 3.
 * No inventa datos; distingue null, vacío y unavailable.
 */
export function buildLocationSectionSummaries(
  data: LocationContextResponse,
): SectionSummary[] {
  const unavailable = data.unavailable_sources

  const territoryState = resolveSectionState({
    sectionPresent: data.territory != null,
    isEmptyOk:
      data.territory != null &&
      data.territory.municipality == null &&
      data.territory.department == null,
    unavailableSources: unavailable,
    component: 'territory',
  })

  const territoryDetail =
    territoryState === 'source_unavailable'
      ? unavailableDetail(unavailable, 'territory')
      : territoryState === 'empty_ok'
        ? 'Sin municipio o departamento identificado para este punto'
        : [
            data.territory?.municipality?.name,
            data.territory?.department?.name,
          ]
            .filter(Boolean)
            .join(', ') || 'Territorio disponible'

  const weatherState = resolveSectionState({
    sectionPresent: data.weather != null,
    isEmptyOk: false,
    unavailableSources: unavailable,
    component: 'weather',
  })

  const temperature = data.weather?.current.temperature_c
  const condition = data.weather?.current.condition
  const weatherDetail =
    weatherState === 'source_unavailable'
      ? unavailableDetail(unavailable, 'weather')
      : [condition, temperature != null ? `${temperature} °C` : null]
          .filter(Boolean)
          .join(' · ') || 'Condiciones disponibles'

  // La UI solo expone actividad reciente (Sismos Sentidos).
  // El catálogo histórico (nearby) permanece en el contrato pero no en el resumen.
  const recentUnavailable = unavailable.some(
    (item) => item.component === 'recent_earthquakes',
  )

  let seismicState: SectionSummary['state']
  let seismicDetail: string

  if (recentUnavailable || data.seismic == null) {
    seismicState = 'source_unavailable'
    seismicDetail = unavailableDetail(unavailable, 'recent_earthquakes')
  } else if (data.seismic.recent.count === 0) {
    seismicState = 'empty_ok'
    seismicDetail =
      'Sin eventos recientes de Sismos Sentidos con epicentro en el radio'
  } else {
    seismicState = 'available'
    seismicDetail = `${data.seismic.recent.count} evento(s) reciente(s) con epicentro en el radio`
  }

  return [
    {
      id: 'territory',
      label: 'Territorio (DANE)',
      state: asSummaryState(territoryState),
      detail: territoryDetail,
    },
    {
      id: 'weather',
      label: 'Clima',
      state: asSummaryState(weatherState),
      detail: weatherDetail,
    },
    ...buildAlertSummaries(data, unavailable),
    {
      id: 'seismic',
      label: 'Sismos (SGC)',
      state: seismicState,
      detail: seismicDetail,
    },
  ]
}

function buildAlertSummaries(
  data: LocationContextResponse,
  unavailable: UnavailableSource[],
): SectionSummary[] {
  const configs = [
    {
      id: 'alerts-hydro',
      label: 'Alertas hidrológicas (IDEAM)',
      component: 'hydrological_alerts',
      bucket: data.alerts?.hydrological ?? null,
      emptyLabel: 'Sin alertas hidrológicas vigentes',
      availableLabel: (count: number) =>
        `${count} alerta(s) hidrológica(s)`,
    },
    {
      id: 'alerts-landslides',
      label: 'Amenaza por remoción (IDEAM)',
      component: 'landslide_alerts',
      bucket: data.alerts?.landslides ?? null,
      emptyLabel: 'Sin amenaza reportada',
      availableLabel: (count: number) =>
        `${count} pronóstico(s) de amenaza (no es incidente activo)`,
    },
    {
      id: 'alerts-fires',
      label: 'Amenaza de incendio (IDEAM)',
      component: 'fire_alerts',
      bucket: data.alerts?.fires ?? null,
      emptyLabel: 'Sin amenaza reportada',
      availableLabel: (count: number) =>
        `${count} pronóstico(s) de amenaza (no es incidente activo)`,
    },
  ] as const

  const alertsRootMissing = data.alerts == null

  return configs.map((config) => {
    const componentUnavailable = unavailable.some(
      (item) => item.component === config.component,
    )

    // alerts=null o subcomponente null → no disponible (no “sin alertas”)
    if (alertsRootMissing || config.bucket == null || componentUnavailable) {
      return {
        id: config.id,
        label: config.label,
        state: 'source_unavailable' as const,
        detail: unavailableDetail(unavailable, config.component),
      }
    }

    if (!config.bucket.has_alerts || config.bucket.count === 0) {
      return {
        id: config.id,
        label: config.label,
        state: 'empty_ok' as const,
        detail: config.emptyLabel,
      }
    }

    return {
      id: config.id,
      label: config.label,
      state: 'available' as const,
      detail: config.availableLabel(config.bucket.count),
    }
  })
}

function asSummaryState(
  state: SectionUiState,
): SectionSummary['state'] {
  if (
    state === 'available' ||
    state === 'empty_ok' ||
    state === 'source_unavailable'
  ) {
    return state
  }

  return 'source_unavailable'
}

export function listUnavailableSourceMessages(
  data: LocationContextResponse,
): string[] {
  // La minería ANM no se expone en la UI; se omite del aviso parcial.
  return data.unavailable_sources
    .filter((item) => item.component !== 'mining')
    .map((item) => `${item.service} (${item.component}): ${item.message}`)
}
