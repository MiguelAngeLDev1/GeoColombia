import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeismicPanel } from './SeismicPanel'

const historicalEarthquake = {
  id: 1,
  magnitude: 3.2,
  depth_km: 40,
  occurred_at: '2024-01-10T12:00:00Z',
  latitude: 4.5,
  longitude: -75.2,
  distance_km: 12.4,
}

describe('SeismicPanel', () => {
  it('oculta el catálogo histórico y muestra actividad reciente', () => {
    render(
      <SeismicPanel
        seismic={{
          radius_km: 50,
          count: 1,
          returned: 1,
          earthquakes: [historicalEarthquake],
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
                max_intensity: 4,
              },
            ],
          },
        }}
        unavailableSources={[]}
      />,
    )

    expect(
      screen.getByText('Actividad sísmica reciente'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Eventos registrados en Sismos Sentidos del Servicio Geológico Colombiano/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Sismos del catálogo histórico'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/pueden ser antiguos/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Cerca de Ibagué/)).toBeInTheDocument()
    expect(screen.getByText(/M 2[,.]8/)).toBeInTheDocument()
    expect(screen.getByText(/8[,.]?0? km/)).toBeInTheDocument()
    expect(
      screen.getByText(/Intensidad máxima reportada/i),
    ).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(
      screen.getByText(/no indica la intensidad en el municipio/i),
    ).toBeInTheDocument()
  })

  it('muestra vacío reciente sin afirmar ausencia de sismos sentidos', () => {
    render(
      <SeismicPanel
        seismic={{
          radius_km: 50,
          count: 5,
          returned: 5,
          earthquakes: [historicalEarthquake],
          recent: { count: 0, returned: 0, earthquakes: [] },
        }}
        unavailableSources={[]}
      />,
    )

    expect(
      screen.getByText(
        /No se encontraron eventos recientes de Sismos Sentidos con epicentro dentro del radio consultado/i,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/No hubo sismos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/No se sintieron/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText('Sismos del catálogo histórico'),
    ).not.toBeInTheDocument()
  })

  it('trata fallo de recent_earthquakes como no disponible', () => {
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
            component: 'recent_earthquakes',
            message: 'timeout',
          },
        ]}
      />,
    )

    expect(
      screen.getByText(/fuente temporalmente no disponible/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        /No se encontraron eventos recientes de Sismos Sentidos/i,
      ),
    ).not.toBeInTheDocument()
  })

  it('no deja que nearby_earthquakes afecte la sección reciente', () => {
    render(
      <SeismicPanel
        seismic={{
          radius_km: 50,
          count: 0,
          returned: 0,
          earthquakes: [],
          recent: {
            count: 1,
            returned: 1,
            earthquakes: [
              {
                id: 'ok',
                magnitude: 3.1,
                depth_km: 16,
                occurred_at: '2026-10-15T18:27:18Z',
                location: 'Chaparral - Tolima, Colombia',
                distance_km: 4.2,
              },
            ],
          },
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

    expect(screen.getByText(/Chaparral - Tolima/)).toBeInTheDocument()
    expect(screen.getByText(/Disponible/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/fuente temporalmente no disponible/i),
    ).not.toBeInTheDocument()
  })

  it('omite intensidad máxima cuando no viene en el evento', () => {
    render(
      <SeismicPanel
        seismic={{
          radius_km: 50,
          count: 0,
          returned: 0,
          earthquakes: [],
          recent: {
            count: 1,
            returned: 1,
            earthquakes: [
              {
                id: 'no-imax',
                magnitude: 2.5,
                occurred_at: '2026-10-16T05:40:00Z',
                location: 'Chaparral - Tolima, Colombia',
                distance_km: 6,
              },
            ],
          },
        }}
        unavailableSources={[]}
      />,
    )

    expect(
      screen.queryByText(/Intensidad máxima reportada/i),
    ).not.toBeInTheDocument()
  })

  it('ordena eventos del más reciente al más antiguo', () => {
    const { container } = render(
      <SeismicPanel
        seismic={{
          radius_km: 50,
          count: 0,
          returned: 0,
          earthquakes: [],
          recent: {
            count: 2,
            returned: 2,
            earthquakes: [
              {
                id: 'older',
                magnitude: 2.4,
                occurred_at: '2026-10-13T04:20:25Z',
                location: 'Evento antiguo',
                distance_km: 3,
              },
              {
                id: 'newer',
                magnitude: 2.8,
                occurred_at: '2026-10-17T20:30:20Z',
                location: 'Evento reciente',
                distance_km: 1,
              },
            ],
          },
        }}
        unavailableSources={[]}
      />,
    )

    const list = container.querySelector('ul')
    expect(list).not.toBeNull()
    const items = within(list as HTMLElement).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(/Evento reciente/)
    expect(items[1]).toHaveTextContent(/Evento antiguo/)
  })
})
