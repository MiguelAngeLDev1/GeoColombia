import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSeismicLayerToggle } from './useSeismicLayerToggle'

describe('useSeismicLayerToggle', () => {
  it('inicia desactivado y permite activar/desactivar', () => {
    const { result } = renderHook(() => useSeismicLayerToggle())
    expect(result.current.enabled).toBe(false)

    act(() => {
      result.current.toggle()
    })
    expect(result.current.enabled).toBe(true)

    act(() => {
      result.current.setLayerEnabled(false)
    })
    expect(result.current.enabled).toBe(false)
  })
})
