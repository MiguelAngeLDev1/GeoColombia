import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const flyTo = vi.fn()

vi.mock('react-leaflet', () => ({
  useMap: () => ({
    flyTo,
  }),
}))

import { MapFlyTo } from './MapFlyTo'

describe('MapFlyTo', () => {
  it('centra el mapa con flyTo cuando llega un focusRequest', () => {
    flyTo.mockClear()

    const { rerender } = render(
      <MapFlyTo
        focusRequest={{
          point: { latitude: 4.711, longitude: -74.0721 },
          nonce: 1,
          zoom: 12,
        }}
      />,
    )

    expect(flyTo).toHaveBeenCalledWith([4.711, -74.0721], 12, {
      duration: 1.15,
    })

    flyTo.mockClear()
    rerender(
      <MapFlyTo
        focusRequest={{
          point: { latitude: 4.711, longitude: -74.0721 },
          nonce: 1,
          zoom: 12,
        }}
      />,
    )
    expect(flyTo).not.toHaveBeenCalled()

    rerender(
      <MapFlyTo
        focusRequest={{
          point: { latitude: 6.2442, longitude: -75.5812 },
          nonce: 2,
          zoom: 12,
        }}
      />,
    )
    expect(flyTo).toHaveBeenCalledWith([6.2442, -75.5812], 12, {
      duration: 1.15,
    })
  })
})
