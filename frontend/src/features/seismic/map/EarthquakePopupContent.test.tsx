import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EarthquakePopupContent } from './EarthquakePopupContent'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const quake = {
  id: 'SGC2026uotcbh',
  magnitude: 2.9,
  depth_km: 17,
  occurred_at: '2026-10-19T07:25:32Z',
  latitude: 3.85,
  longitude: -75.63,
  location: 'Chaparral - Tolima, Colombia',
  max_intensity: 4,
}

describe('EarthquakePopupContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('muestra datos del popup sin consultar detalle automáticamente', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<EarthquakePopupContent earthquake={quake} />, { wrapper })

    expect(screen.getByText(/M 2,9|M 2.9/)).toBeInTheDocument()
    expect(screen.getByText('SGC2026uotcbh')).toBeInTheDocument()
    expect(screen.getByText(/Chaparral/)).toBeInTheDocument()
    expect(screen.getByText(/Intensidad máxima reportada/)).toBeInTheDocument()
    expect(screen.getByText(/Servicio Geológico Colombiano/)).toBeInTheDocument()
    expect(
      screen.getByText(/La ubicación corresponde al epicentro/),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no mezcla reportes de otro evento al cargar detalle', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            source: 'Servicio Geológico Colombiano',
            data: {
              id: 'SGC_OTRO_EVENTO',
              magnitude: 5,
              depth_km: 10,
              occurred_at: '2026-10-01T00:00:00Z',
              latitude: 1,
              longitude: -74,
              location: 'Otro',
              reports: { count: 1, population_centers: 1 },
              felt_locations: [
                {
                  municipality: 'MUNICIPIO_INCORRECTO',
                  intensity: 5,
                  reports: 9,
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    render(<EarthquakePopupContent earthquake={quake} />, { wrapper })
    await user.click(screen.getByRole('button', { name: /Ver reportes/i }))

    await waitFor(() => {
      expect(screen.queryByText(/MUNICIPIO_INCORRECTO/)).not.toBeInTheDocument()
    })
  })

  it('carga reportes bajo demanda e incluye Ibagué cuando la API lo envía', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            source: 'Servicio Geológico Colombiano',
            data: {
              id: 'SGC2026tyyfla',
              magnitude: 3.4,
              depth_km: 16,
              occurred_at: '2026-10-10T16:48:42Z',
              latitude: 3.85,
              longitude: -75.63,
              location: 'Chaparral - Tolima, Colombia',
              reports: { count: 11, population_centers: 8 },
              felt_locations: [
                {
                  municipality: 'IBAGUÉ, TOLIMA',
                  intensity: 2,
                  reports: 2,
                  distance_km: 82.97,
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    render(
      <EarthquakePopupContent
        earthquake={{ ...quake, id: 'SGC2026tyyfla', magnitude: 3.4 }}
      />,
      { wrapper },
    )

    await user.click(screen.getByRole('button', { name: /Ver reportes/i }))

    await waitFor(() => {
      expect(screen.getByText(/IBAGUÉ/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Intensidad:\s*2/)).toBeInTheDocument()
  })

  it('muestra vacío sin afirmar que no se sintió', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            source: 'Servicio Geológico Colombiano',
            data: {
              id: 'SGC2026uotcbh',
              magnitude: 2.9,
              depth_km: 17,
              occurred_at: '2026-10-19T07:25:32Z',
              latitude: 3.85,
              longitude: -75.63,
              location: 'Chaparral - Tolima, Colombia',
              reports: { count: 0, population_centers: 0 },
              felt_locations: [],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )

    render(<EarthquakePopupContent earthquake={quake} />, { wrapper })
    await user.click(screen.getByRole('button', { name: /Ver reportes/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/No hay reportes municipales disponibles/),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText(/no se sintió/i)).not.toBeInTheDocument()
  })
})
