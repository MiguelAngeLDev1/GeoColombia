import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeismicLayerLegend } from './SeismicLayerLegend'

describe('SeismicLayerLegend', () => {
  it('no renderiza cuando está oculta', () => {
    const { container } = render(<SeismicLayerLegend visible={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra bandas de magnitud sin llamarlas alerta sísmica', () => {
    render(<SeismicLayerLegend visible />)
    expect(
      screen.getByLabelText('Leyenda de magnitudes sísmicas'),
    ).toBeInTheDocument()
    expect(screen.getByText('M < 3')).toBeInTheDocument()
    expect(screen.getByText(/M ≥ 5/)).toBeInTheDocument()
    expect(screen.getByText(/No es una alerta sísmica/)).toBeInTheDocument()
  })
})
