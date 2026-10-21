import { describe, expect, it } from 'vitest'
import { ALERT_LAYER_MAX_SPAN_DEG } from './alertLayerBbox'
import {
  NATIONAL_PRECISION_BANNER,
  REGIONAL_PRECISION_BANNER,
  resolveAlertLayerMode,
} from './alertLayerMode'

describe('resolveAlertLayerMode', () => {
  it('elige regional cuando lon y lat ≤ 1.5°', () => {
    const decision = resolveAlertLayerMode({
      west: -75.4,
      south: 4.3,
      east: -75.05,
      north: 4.55,
    })
    expect(decision.mode).toBe('regional')
    if (decision.mode === 'regional') {
      expect(decision.bbox).toBe('-75.4,4.3,-75.05,4.55')
      expect(decision.spanLon).toBeLessThanOrEqual(ALERT_LAYER_MAX_SPAN_DEG)
      expect(decision.spanLat).toBeLessThanOrEqual(ALERT_LAYER_MAX_SPAN_DEG)
    }
  })

  it('elige regional en el umbral exacto de 1.5°', () => {
    const decision = resolveAlertLayerMode({
      west: -75.0,
      south: 4.0,
      east: -73.5,
      north: 5.5,
    })
    expect(decision.mode).toBe('regional')
    if (decision.mode === 'regional') {
      expect(decision.spanLon).toBe(1.5)
      expect(decision.spanLat).toBe(1.5)
    }
  })

  it('elige nacional cuando algún span supera 1.5°', () => {
    const decision = resolveAlertLayerMode({
      west: -79,
      south: -4,
      east: -67,
      north: 13,
    })
    expect(decision.mode).toBe('national')
    if (decision.mode === 'national') {
      expect(decision.spanLon).toBeGreaterThan(ALERT_LAYER_MAX_SPAN_DEG)
      expect(decision.spanLat).toBeGreaterThan(ALERT_LAYER_MAX_SPAN_DEG)
    }
  })

  it('elige nacional si solo un eje supera 1.5°', () => {
    const decision = resolveAlertLayerMode({
      west: -76.0,
      south: 4.0,
      east: -74.0,
      north: 4.5,
    })
    expect(decision.mode).toBe('national')
    if (decision.mode === 'national') {
      expect(decision.spanLon).toBe(2)
      expect(decision.spanLat).toBe(0.5)
    }
  })

  it('marca unavailable fuera de cobertura', () => {
    const decision = resolveAlertLayerMode({
      west: 0,
      south: 40,
      east: 1,
      north: 41,
    })
    expect(decision.mode).toBe('unavailable')
    if (decision.mode === 'unavailable') {
      expect(decision.reason).toBe('out_of_coverage')
    }
  })

  it('marca unavailable con viewport nulo', () => {
    const decision = resolveAlertLayerMode(null)
    expect(decision.mode).toBe('unavailable')
    if (decision.mode === 'unavailable') {
      expect(decision.reason).toBe('invalid')
    }
  })

  it('expone textos de precisión para banners', () => {
    expect(NATIONAL_PRECISION_BANNER).toMatch(/simplificada/i)
    expect(NATIONAL_PRECISION_BANNER).toMatch(/aproximados/i)
    expect(REGIONAL_PRECISION_BANNER).toMatch(/regional detallada/i)
  })
})
