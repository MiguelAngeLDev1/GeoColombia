import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TerritoryPanel } from './TerritoryPanel'

describe('TerritoryPanel', () => {
  it('renderiza campos completos', () => {
    render(
      <TerritoryPanel
        territory={{
          department: { code: '73', name: 'Tolima' },
          municipality: {
            code: '73001',
            name: 'Ibagué',
            type: 'Municipio',
            area_km2: 1439.12,
          },
          reference_year: 2018,
        }}
        unavailableSources={[]}
      />,
    )

    expect(screen.getByText('Ibagué')).toBeInTheDocument()
    expect(screen.getByText('Tolima')).toBeInTheDocument()
    expect(screen.getByText('73001')).toBeInTheDocument()
    expect(screen.getByText('Tipo')).toBeInTheDocument()
    expect(screen.getAllByText('Municipio').length).toBeGreaterThan(0)
    expect(screen.getByText(/km²/)).toBeInTheDocument()
    expect(screen.getByText('2018')).toBeInTheDocument()
  })

  it('omite opcionales ausentes y muestra no disponible', () => {
    const { rerender } = render(
      <TerritoryPanel
        territory={{
          department: { code: '11', name: 'Bogotá, D.C.' },
          municipality: { code: '11001', name: 'Bogotá, D.C.' },
        }}
        unavailableSources={[]}
      />,
    )

    expect(screen.queryByText('Tipo')).not.toBeInTheDocument()
    expect(screen.queryByText('Área')).not.toBeInTheDocument()

    rerender(
      <TerritoryPanel
        territory={null}
        unavailableSources={[
          {
            service: 'DANE',
            component: 'territory',
            message: 'timeout',
          },
        ]}
      />,
    )

    expect(
      screen.getByText(/fuente temporalmente no disponible/i),
    ).toBeInTheDocument()
  })
})
