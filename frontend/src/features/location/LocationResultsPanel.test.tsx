import type { UseQueryResult } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import type { LocationContextResponse } from '../../types/location'
import { LocationResultsPanel } from './LocationResultsPanel'

function queryResult(
  overrides: Record<string, unknown> = {},
): UseQueryResult<LocationContextResponse, Error> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isSuccess: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as UseQueryResult<LocationContextResponse, Error>
}

const sampleData: LocationContextResponse = {
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
}

describe('LocationResultsPanel', () => {
  it('muestra estado inicial sin selección', () => {
    render(
      <LocationResultsPanel selectedPoint={null} query={queryResult({})} />,
    )

    expect(
      screen.getByText('Selecciona un punto en el mapa'),
    ).toBeInTheDocument()
  })

  it('no muestra datos previos mientras carga una nueva ubicación', () => {
    render(
      <LocationResultsPanel
        selectedPoint={{ latitude: 4.4, longitude: -75.2 }}
        query={queryResult({
          isPending: true,
          isLoading: true,
          isFetching: true,
          data: undefined,
        })}
      />,
    )

    expect(screen.getByText(/Consultando contexto/i)).toBeInTheDocument()
    expect(screen.queryByText('Territorio')).not.toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renderiza paneles detallados en éxito', () => {
    render(
      <LocationResultsPanel
        selectedPoint={{ latitude: 4.4389, longitude: -75.2322 }}
        query={queryResult({
          isSuccess: true,
          data: sampleData,
        })}
      />,
    )

    expect(screen.getByText('Territorio')).toBeInTheDocument()
    expect(screen.getByText('Clima')).toBeInTheDocument()
    expect(screen.getByText('Alertas hidrológicas')).toBeInTheDocument()
    expect(screen.queryByText('Títulos mineros')).not.toBeInTheDocument()
    expect(screen.queryByText(/ANM/i)).not.toBeInTheDocument()
  })
})
