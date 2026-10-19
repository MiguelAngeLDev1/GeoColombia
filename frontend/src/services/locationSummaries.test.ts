import { describe, expect, it } from 'vitest'
import type { LocationContextResponse } from '../types/location'
import { buildLocationSectionSummaries } from './locationSummaries'

function baseResponse(
  overrides: Partial<LocationContextResponse> = {},
): LocationContextResponse {
  return {
    location: { latitude: 4.4389, longitude: -75.2322 },
    territory: {
      department: { code: '73', name: 'Tolima' },
      municipality: { code: '73001', name: 'Ibagué' },
      reference_year: 2018,
    },
    weather: {
      source: 'Open-Meteo',
      timezone: 'America/Bogota',
      current: {
        temperature_c: 21,
        condition: 'Despejado',
        is_raining: false,
      },
      next_hours: [],
    },
    alerts: {
      source: 'IDEAM',
      hydrological: { has_alerts: false, count: 0, alerts: [] },
      landslides: { has_alerts: false, count: 0, alerts: [] },
      fires: { has_alerts: false, count: 0, alerts: [] },
    },
    mining: { has_titles: false, count: 0, titles: [] },
    seismic: {
      radius_km: 50,
      count: 0,
      returned: 0,
      earthquakes: [],
      recent: { count: 0, returned: 0, earthquakes: [] },
    },
    unavailable_sources: [],
    ...overrides,
  }
}

describe('buildLocationSectionSummaries', () => {
  it('marca alertas disponibles sin resultados como empty_ok', () => {
    const summaries = buildLocationSectionSummaries(baseResponse())
    const landslides = summaries.find((item) => item.id === 'alerts-landslides')

    expect(landslides?.state).toBe('empty_ok')
    expect(landslides?.detail).toMatch(/Sin amenaza/i)
  })

  it('no interpreta alerts=null como ausencia de alertas', () => {
    const summaries = buildLocationSectionSummaries(
      baseResponse({
        alerts: null,
        unavailable_sources: [
          {
            service: 'IDEAM',
            component: 'hydrological_alerts',
            message: 'down',
          },
          {
            service: 'IDEAM',
            component: 'landslide_alerts',
            message: 'down',
          },
          {
            service: 'IDEAM',
            component: 'fire_alerts',
            message: 'down',
          },
        ],
      }),
    )

    const hydro = summaries.find((item) => item.id === 'alerts-hydro')
    expect(hydro?.state).toBe('source_unavailable')
    expect(hydro?.detail).not.toMatch(/Sin alertas hidrológicas vigentes/i)
  })

  it('marca subcomponente de alerta null como no disponible', () => {
    const summaries = buildLocationSectionSummaries(
      baseResponse({
        alerts: {
          source: 'IDEAM',
          hydrological: { has_alerts: false, count: 0, alerts: [] },
          landslides: null,
          fires: { has_alerts: false, count: 0, alerts: [] },
        },
        unavailable_sources: [
          {
            service: 'IDEAM',
            component: 'landslide_alerts',
            message: 'timeout',
          },
        ],
      }),
    )

    expect(
      summaries.find((item) => item.id === 'alerts-landslides')?.state,
    ).toBe('source_unavailable')
  })

  it('revisa unavailable_sources antes de interpretar sismos vacíos', () => {
    const summaries = buildLocationSectionSummaries(
      baseResponse({
        seismic: {
          radius_km: 50,
          count: 0,
          returned: 0,
          earthquakes: [],
          recent: { count: 2, returned: 2, earthquakes: [] },
        },
        unavailable_sources: [
          {
            service: 'SGC',
            component: 'nearby_earthquakes',
            message: 'timeout',
          },
        ],
      }),
    )

    const seismic = summaries.find((item) => item.id === 'seismic')
    expect(seismic?.detail).toMatch(/Sismos cercanos no disponibles/i)
    expect(seismic?.detail).not.toMatch(/^Sin sismos en 50 km$/i)
  })
})
