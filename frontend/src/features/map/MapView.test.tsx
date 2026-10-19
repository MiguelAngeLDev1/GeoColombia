import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const mapContainerProps: Record<string, unknown>[] = []

vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    ...props
  }: {
    children?: ReactNode
  } & Record<string, unknown>) => {
    mapContainerProps.push(props)
    return (
      <div data-testid="leaflet-map-container" {...sanitize(props)}>
        {children}
      </div>
    )
  },
  TileLayer: (props: Record<string, unknown>) => (
    <div
      data-testid="leaflet-tile-layer"
      data-url={String(props.url ?? '')}
      data-attribution={String(props.attribution ?? '')}
    />
  ),
  Marker: (props: {
    position: [number, number]
    alt?: string
  }) => (
    <div
      data-testid="leaflet-marker"
      data-lat={String(props.position[0])}
      data-lng={String(props.position[1])}
      aria-label={props.alt}
    />
  ),
  useMap: () => ({
    invalidateSize: vi.fn(),
    flyTo: vi.fn(),
  }),
  useMapEvents: () => ({}),
}))

vi.mock('./leafletSetup', () => ({
  ensureLeafletDefaultIcons: vi.fn(),
  createSelectionIcon: vi.fn(() => ({ options: {} })),
}))

import { MapView } from './MapView'

function sanitize(props: Record<string, unknown>) {
  const allowed: Record<string, string> = {}
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' || typeof value === 'number') {
      allowed[key] = String(value)
    }
  }
  return allowed
}

describe('MapView', () => {
  it('renderiza el contenedor del mapa centrado en Colombia sin marcador inicial', () => {
    render(
      <MapView selectedPoint={null} onSelectPoint={vi.fn()} />,
    )

    expect(
      screen.getByLabelText('Mapa interactivo de Colombia'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('leaflet-map-container')).toBeInTheDocument()
    expect(screen.getByTestId('leaflet-tile-layer')).toHaveAttribute(
      'data-url',
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    )
    expect(screen.queryByTestId('leaflet-marker')).not.toBeInTheDocument()

    const lastProps = mapContainerProps.at(-1)
    expect(lastProps?.center).toEqual([4.5709, -74.2973])
  })

  it('muestra marcador cuando hay un punto seleccionado', () => {
    render(
      <MapView
        selectedPoint={{ latitude: 4.711, longitude: -74.0721 }}
        onSelectPoint={vi.fn()}
      />,
    )

    const marker = screen.getByTestId('leaflet-marker')
    expect(marker).toHaveAttribute('data-lat', '4.711')
    expect(marker).toHaveAttribute('data-lng', '-74.0721')
  })
})
