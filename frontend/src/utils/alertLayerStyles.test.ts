import { describe, expect, it } from 'vitest'
import {
  getAlertLayerPathOptions,
  getAlertLevelStyle,
  isActiveAlertLevel,
} from './alertLayerStyles'

describe('alertLayerStyles', () => {
  it('asigna colores por nivel 1/2/3', () => {
    expect(getAlertLevelStyle(1)?.fillColor).toBe('#eab308')
    expect(getAlertLevelStyle(2)?.fillColor).toBe('#f97316')
    expect(getAlertLevelStyle(3)?.fillColor).toBe('#ef4444')
  })

  it('no trata PROBABILID/nivel 0 como amenaza activa', () => {
    expect(isActiveAlertLevel(0)).toBe(false)
    expect(getAlertLevelStyle(0)).toBeNull()
    const hidden = getAlertLayerPathOptions('fires', 0)
    expect(hidden.fillOpacity).toBe(0)
    expect(hidden.stroke).toBe(false)
  })

  it('diferencia capas con dashArray distinto', () => {
    const hydro = getAlertLayerPathOptions('hydrological', 2)
    const slides = getAlertLayerPathOptions('landslides', 2)
    const fires = getAlertLayerPathOptions('fires', 2)

    expect(hydro.dashArray).toBeUndefined()
    expect(slides.dashArray).toBe('5 4')
    expect(fires.dashArray).toBe('1 5')
    expect(hydro.fillColor).toBe(slides.fillColor)
  })
})
