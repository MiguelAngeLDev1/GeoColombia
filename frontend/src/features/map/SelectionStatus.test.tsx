import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SelectionStatus } from './SelectionStatus'

describe('SelectionStatus', () => {
  it('muestra mensaje claro sin selección', () => {
    render(<SelectionStatus selectedPoint={null} />)

    expect(screen.getByText(/Sin punto seleccionado/i)).toBeInTheDocument()
    expect(screen.getByText(/Toca el mapa/i)).toBeInTheDocument()
  })

  it('muestra coordenadas compactas cuando hay selección', () => {
    render(
      <SelectionStatus
        selectedPoint={{
          latitude: 4.711,
          longitude: -74.0721,
        }}
      />,
    )

    expect(screen.getByText('Punto')).toBeInTheDocument()
    expect(screen.getByText('4.71100° N')).toBeInTheDocument()
    expect(screen.getByText('74.07210° O')).toBeInTheDocument()
  })
})
