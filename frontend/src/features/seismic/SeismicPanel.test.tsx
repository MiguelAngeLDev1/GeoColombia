import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeismicPanel } from './SeismicPanel'

describe('SeismicPanel', () => {
  it('distingue catálogo histórico de sismos recientes', () => {
    render(
      <SeismicPanel
        seismic={{
          radius_km: 50,
          count: 1,
          returned: 1,
          earthquakes: [
            {
              id: 1,
              magnitude: 3.2,
              depth_km: 40,
              occurred_at: '2024-01-10T12:00:00Z',
              latitude: 4.5,
              longitude: -75.2,
              distance_km: 12.4,
            },
          ],
          recent: {
            count: 1,
            returned: 1,
            earthquakes: [
              {
                id: 'abc',
                magnitude: 2.8,
                depth_km: 20,
                occurred_at: '2024-01-11T08:00:00Z',
                location: 'Cerca de Ibagué',
                distance_km: 8,
              },
            ],
          },
        }}
        unavailableSources={[]}
      />,
    )

    expect(
      screen.getByText('Sismos del catálogo histórico'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/pueden ser antiguos/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Sismos recientes (sentidos)')).toBeInTheDocument()
    expect(screen.getByText(/Cerca de Ibagué/)).toBeInTheDocument()
    expect(screen.getAllByText(/M /).length).toBeGreaterThan(0)
  })

  it('no presenta fallo parcial de SGC como cero sismos', () => {
    render(
      <SeismicPanel
        seismic={{
          radius_km: 50,
          count: 0,
          returned: 0,
          earthquakes: [],
          recent: { count: 0, returned: 0, earthquakes: [] },
        }}
        unavailableSources={[
          {
            service: 'SGC',
            component: 'nearby_earthquakes',
            message: 'timeout',
          },
        ]}
      />,
    )

    expect(
      screen.getByText(/fuente temporalmente no disponible/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Sin registros del catálogo histórico/i),
    ).not.toBeInTheDocument()
  })
})
