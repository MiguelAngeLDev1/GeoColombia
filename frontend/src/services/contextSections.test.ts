import { describe, expect, it } from 'vitest'
import {
  resolveAlertBucketSection,
  resolveNearbySeismicSection,
  resolveRecentSeismicSection,
  resolveTerritorySection,
} from './contextSections'
import type { LocationContextResponse } from '../types/location'

const emptyUnavailable: LocationContextResponse['unavailable_sources'] = []

describe('contextSections', () => {
  it('territorio completo vs campos opcionales ausentes', () => {
    expect(
      resolveTerritorySection(
        {
          department: { code: '73', name: 'Tolima' },
          municipality: {
            code: '73001',
            name: 'Ibagué',
            type: 'Municipio',
            area_km2: 1439,
          },
          reference_year: 2018,
        },
        emptyUnavailable,
      ),
    ).toBe('available')

    expect(
      resolveTerritorySection(
        { department: null, municipality: null },
        emptyUnavailable,
      ),
    ).toBe('empty_ok')

    expect(resolveTerritorySection(null, emptyUnavailable)).toBe(
      'source_unavailable',
    )
  })

  it('distingue fallo parcial de SGC de cero sismos', () => {
    const seismic = {
      radius_km: 50,
      count: 0,
      returned: 0,
      earthquakes: [],
      recent: { count: 2, returned: 2, earthquakes: [] },
    }

    expect(
      resolveNearbySeismicSection(seismic, [
        {
          service: 'SGC',
          component: 'nearby_earthquakes',
          message: 'timeout',
        },
      ]),
    ).toBe('source_unavailable')

    expect(resolveRecentSeismicSection(seismic, emptyUnavailable)).toBe(
      'available',
    )

    expect(
      resolveNearbySeismicSection(
        { ...seismic, recent: { count: 0, returned: 0, earthquakes: [] } },
        emptyUnavailable,
      ),
    ).toBe('empty_ok')
  })

  it('alertas: has_alerts=false, null e IDEAM degradado', () => {
    expect(
      resolveAlertBucketSection(
        {
          source: 'IDEAM',
          hydrological: { has_alerts: false, count: 0, alerts: [] },
          landslides: null,
          fires: { has_alerts: true, count: 1, alerts: [] },
        },
        'hydrological',
        'hydrological_alerts',
        emptyUnavailable,
      ),
    ).toBe('empty_ok')

    expect(
      resolveAlertBucketSection(
        {
          source: 'IDEAM',
          hydrological: { has_alerts: false, count: 0, alerts: [] },
          landslides: null,
          fires: null,
        },
        'landslides',
        'landslide_alerts',
        [
          {
            service: 'IDEAM',
            component: 'landslide_alerts',
            message: 'down',
          },
        ],
      ),
    ).toBe('source_unavailable')

    expect(
      resolveAlertBucketSection(
        null,
        'fires',
        'fire_alerts',
        emptyUnavailable,
      ),
    ).toBe('source_unavailable')
  })
})
