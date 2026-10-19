import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMapSelection } from './useMapSelection'

describe('useMapSelection', () => {
  it('inicia sin selección', () => {
    const { result } = renderHook(() => useMapSelection())

    expect(result.current.selectedPoint).toBeNull()
  })

  it('selecciona coordenadas al elegir un punto', () => {
    const { result } = renderHook(() => useMapSelection())

    act(() => {
      result.current.selectPoint({
        latitude: 4.711,
        longitude: -74.0721,
      })
    })

    expect(result.current.selectedPoint).toEqual({
      latitude: 4.711,
      longitude: -74.0721,
    })
  })

  it('actualiza la selección cuando se elige otro punto', () => {
    const { result } = renderHook(() => useMapSelection())

    act(() => {
      result.current.selectPoint({
        latitude: 4.711,
        longitude: -74.0721,
      })
    })

    act(() => {
      result.current.selectPoint({
        latitude: 6.2442,
        longitude: -75.5812,
      })
    })

    expect(result.current.selectedPoint).toEqual({
      latitude: 6.2442,
      longitude: -75.5812,
    })
  })

  it('limpia la selección', () => {
    const { result } = renderHook(() =>
      useMapSelection({
        latitude: 10.391,
        longitude: -75.5144,
      }),
    )

    act(() => {
      result.current.clearSelection()
    })

    expect(result.current.selectedPoint).toBeNull()
  })
})
