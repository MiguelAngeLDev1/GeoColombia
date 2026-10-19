import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

vi.mock('../features/map/MapView', () => ({
  MapView: ({
    selectedPoint,
  }: {
    selectedPoint: { latitude: number; longitude: number } | null
  }) => (
    <div
      aria-label="Mapa interactivo de Colombia"
      data-testid="map-view-mock"
      data-has-selection={selectedPoint ? 'true' : 'false'}
    />
  ),
}))

describe('HomePage', () => {
  it('muestra la marca y el eslogan de GeoColombia', () => {
    render(<HomePage />)

    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent('GeoColombia')

    expect(
      screen.getByText('Descubre qué está pasando en Colombia.'),
    ).toBeInTheDocument()
  })

  it('integra el mapa y el estado inicial sin selección', () => {
    render(<HomePage />)

    expect(
      screen.getByLabelText('Mapa interactivo de Colombia'),
    ).toBeInTheDocument()

    expect(screen.getByText('Sin punto seleccionado')).toBeInTheDocument()
    expect(screen.getByTestId('map-view-mock')).toHaveAttribute(
      'data-has-selection',
      'false',
    )
  })
})
