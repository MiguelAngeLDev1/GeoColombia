import type { UseQueryResult } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import type { LocationContextResponse } from '../../types/location'
import { LocationResultsPanel } from './LocationResultsPanel'

function queryResult(
  overrides: Partial<UseQueryResult<LocationContextResponse, Error>>,
): UseQueryResult<LocationContextResponse, Error> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isFetching: false,
    isSuccess: false,
    refetch: vi.fn(),
    ...overrides,
  } as UseQueryResult<LocationContextResponse, Error>
}

describe('LocationResultsPanel', () => {
  it('muestra estado inicial sin selección', () => {
    render(
      <LocationResultsPanel
        selectedPoint={null}
        query={queryResult({})}
      />,
    )

    expect(
      screen.getByText('Selecciona un punto en el mapa'),
    ).toBeInTheDocument()
  })

  it('permite reintentar después de un error', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()

    render(
      <LocationResultsPanel
        selectedPoint={{ latitude: 4.4, longitude: -75.2 }}
        query={queryResult({
          isError: true,
          error: new ApiError('http', 502, 'All external providers failed'),
          refetch,
        })}
      />,
    )

    expect(screen.getByText('Error al consultar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('muestra resumen en éxito', () => {
    render(
      <LocationResultsPanel
        selectedPoint={{ latitude: 4.4389, longitude: -75.2322 }}
        query={queryResult({
          isSuccess: true,
          data: {
            location: { latitude: 4.4389, longitude: -75.2322 },
            territory: {
              department: { code: '73', name: 'Tolima' },
              municipality: { code: '73001', name: 'Ibagué' },
            },
            weather: {
              source: 'Open-Meteo',
              timezone: 'America/Bogota',
              current: {
                temperature_c: 22,
                condition: 'Nublado',
                is_raining: false,
              },
              next_hours: [],
            },
            alerts: {
              source: 'IDEAM',
              hydrological: { has_alerts: false, count: 0, alerts: [] },
              landslides: { has_alerts: false, count: 0, alerts: [] },
              fires: { has_alerts: false, count: 0, alerts: [] },
            },
            mining: { has_titles: false, count: 0, titles: [] },
            seismic: {
              radius_km: 50,
              count: 0,
              returned: 0,
              earthquakes: [],
              recent: { count: 0, returned: 0, earthquakes: [] },
            },
            unavailable_sources: [],
          },
        })}
      />,
    )

    expect(screen.getAllByText(/Ibagué/).length).toBeGreaterThan(0)
    expect(screen.getByText('Territorio (DANE)')).toBeInTheDocument()
  })
})
