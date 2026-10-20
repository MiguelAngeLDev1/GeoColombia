import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAlertLayerToggles } from './useAlertLayerToggles'

describe('useAlertLayerToggles', () => {
  it('inicia con las tres capas desactivadas', () => {
    const { result } = renderHook(() => useAlertLayerToggles())
    expect(result.current.enabled).toEqual({
      hydrological: false,
      landslides: false,
      fires: false,
    })
    expect(result.current.anyEnabled).toBe(false)
  })

  it('activa y desactiva capas de forma independiente', () => {
    const { result } = renderHook(() => useAlertLayerToggles())

    act(() => {
      result.current.toggleLayer('hydrological')
    })
    expect(result.current.enabled.hydrological).toBe(true)
    expect(result.current.enabled.landslides).toBe(false)

    act(() => {
      result.current.setLayerEnabled('fires', true)
    })
    expect(result.current.enabled.fires).toBe(true)
    expect(result.current.enabled.hydrological).toBe(true)

    act(() => {
      result.current.toggleLayer('hydrological')
    })
    expect(result.current.enabled.hydrological).toBe(false)
    expect(result.current.enabled.fires).toBe(true)
    expect(result.current.anyEnabled).toBe(true)
  })
})
