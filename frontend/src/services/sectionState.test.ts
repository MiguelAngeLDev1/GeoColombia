import { describe, expect, it } from 'vitest'
import { resolveSectionState } from './sectionState'

describe('resolveSectionState', () => {
  it('distingue vacío válido de fuente no disponible', () => {
    expect(
      resolveSectionState({
        isLoading: false,
        hasError: false,
        sectionPresent: true,
        isEmptyOk: true,
        unavailableSources: [],
        component: 'hydrological_alerts',
      }),
    ).toBe('empty_ok')

    expect(
      resolveSectionState({
        isLoading: false,
        hasError: false,
        sectionPresent: false,
        isEmptyOk: false,
        unavailableSources: [
          {
            service: 'IDEAM',
            component: 'hydrological_alerts',
            message: 'timeout',
          },
        ],
        component: 'hydrological_alerts',
      }),
    ).toBe('source_unavailable')
  })
})
