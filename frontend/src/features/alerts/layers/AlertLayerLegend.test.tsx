import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AlertLayerLegend } from './AlertLayerLegend'

describe('AlertLayerLegend', () => {
  it('no renderiza cuando no es visible', () => {
    const { container } = render(<AlertLayerLegend visible={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra niveles, colores y fuente IDEAM sin afirmar tiempo real', () => {
    render(<AlertLayerLegend visible />)

    expect(screen.getByLabelText('Leyenda de alertas IDEAM')).toBeInTheDocument()
    expect(screen.getByText(/Nivel 1/)).toBeInTheDocument()
    expect(screen.getByText(/Nivel 2/)).toBeInTheDocument()
    expect(screen.getByText(/Nivel 3/)).toBeInTheDocument()
    expect(screen.getByText(/Datos oficiales IDEAM/)).toBeInTheDocument()
    expect(screen.getByText(/No implica actualización en tiempo real/)).toBeInTheDocument()
  })
})
