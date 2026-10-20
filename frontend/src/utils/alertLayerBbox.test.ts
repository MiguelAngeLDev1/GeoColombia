import { describe, expect, it } from 'vitest'
import {
  ALERT_LAYER_MAX_SPAN_DEG,
  evaluateViewportForAlertLayers,
  formatBbox,
  getBboxSpans,
  isBboxWithinCoverage,
  isBboxWithinSpanLimit,
} from './alertLayerBbox'

describe('alertLayerBbox', () => {
  it('formatea bbox min_lon,min_lat,max_lon,max_lat', () => {
    expect(
      formatBbox({
        west: -75.4,
        south: 4.3,
        east: -75.05,
        north: 4.55,
      }),
    ).toBe('-75.4,4.3,-75.05,4.55')
  })

  it('acepta viewport dentro del límite de 1.5°', () => {
    const bounds = {
      west: -75.4,
      south: 4.3,
      east: -75.05,
      north: 4.55,
    }
    expect(isBboxWithinSpanLimit(bounds)).toBe(true)
    expect(getBboxSpans(bounds).spanLon).toBeLessThanOrEqual(
      ALERT_LAYER_MAX_SPAN_DEG,
    )

    const result = evaluateViewportForAlertLayers(bounds)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.bbox).toBe('-75.4,4.3,-75.05,4.55')
    }
  })

  it('rechaza bbox superior a 1.5° (zoom nacional)', () => {
    const national = {
      west: -79,
      south: -4,
      east: -67,
      north: 13,
    }
    expect(isBboxWithinSpanLimit(national)).toBe(false)

    const result = evaluateViewportForAlertLayers(national)
    expect(result.status).toBe('too_large')
    if (result.status === 'too_large') {
      expect(result.message).toMatch(/Acércate/i)
    }
  })

  it('detecta cobertura fuera de Colombia/IDEAM', () => {
    const europe = {
      west: 0,
      south: 40,
      east: 1,
      north: 41,
    }
    expect(isBboxWithinCoverage(europe)).toBe(false)
    expect(evaluateViewportForAlertLayers(europe).status).toBe(
      'out_of_coverage',
    )
  })

  it('trata viewport nulo como inválido', () => {
    expect(evaluateViewportForAlertLayers(null).status).toBe('invalid')
  })
})
