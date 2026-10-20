import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const { stopPropagation, stop } = vi.hoisted(() => ({
  stopPropagation: vi.fn(),
  stop: vi.fn(),
}))

const clickHandlers: Array<(event: { originalEvent?: Event }) => void> = []
const mouseoverHandlers: Array<(event: { target: { bringToFront: () => void } }) => void> =
  []

vi.mock('leaflet', () => ({
  default: {
    DomEvent: { stopPropagation, stop },
  },
}))

vi.mock('react-leaflet', () => ({
  CircleMarker: ({
    children,
    eventHandlers,
    center,
  }: {
    children?: ReactNode
    center: [number, number]
    eventHandlers?: {
      click?: (event: { originalEvent?: Event }) => void
      mouseover?: (event: { target: { bringToFront: () => void } }) => void
    }
  }) => {
    if (eventHandlers?.click) {
      clickHandlers.push(eventHandlers.click)
    }
    if (eventHandlers?.mouseover) {
      mouseoverHandlers.push(eventHandlers.mouseover)
    }
    return (
      <div
        data-testid="quake-circle"
        data-lat={String(center[0])}
        data-lng={String(center[1])}
      >
        {children}
      </div>
    )
  },
  Popup: ({ children }: { children?: ReactNode }) => (
    <div data-testid="quake-popup">{children}</div>
  ),
}))

vi.mock('./EarthquakePopupContent', () => ({
  EarthquakePopupContent: () => <div>popup-content</div>,
}))

import { EarthquakeMarker } from './EarthquakeMarker'

describe('EarthquakeMarker', () => {
  it('renderiza coordenadas y detiene propagación del clic', () => {
    clickHandlers.length = 0
    stopPropagation.mockClear()
    stop.mockClear()

    render(
      <EarthquakeMarker
        earthquake={{
          id: 'SGC1',
          latitude: 3.85,
          longitude: -75.63,
          magnitude: 2.9,
          location: 'Chaparral',
        }}
      />,
    )

    expect(screen.getByTestId('quake-circle')).toHaveAttribute(
      'data-lat',
      '3.85',
    )
    expect(screen.getByTestId('quake-popup')).toHaveTextContent(
      'popup-content',
    )

    const originalEvent = new Event('click')
    clickHandlers[0]?.({ originalEvent })
    expect(stopPropagation).toHaveBeenCalled()
    expect(stop).toHaveBeenCalledWith(originalEvent)

    const bringToFront = vi.fn()
    mouseoverHandlers[0]?.({ target: { bringToFront } })
    expect(bringToFront).toHaveBeenCalled()
  })
})
