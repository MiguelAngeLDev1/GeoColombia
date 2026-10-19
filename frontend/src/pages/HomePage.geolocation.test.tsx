import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryProvider } from '../components/QueryProvider'
import * as geolocationService from '../services/geolocation'

const mapProps: Array<{
  selectedPoint: { latitude: number; longitude: number } | null
  focusRequest: {
    point: { latitude: number; longitude: number }
    nonce: number
  } | null
}> = []

vi.mock('../features/map/MapView', () => ({
  MapView: (props: {
    selectedPoint: { latitude: number; longitude: number } | null
    onSelectPoint: (point: {
      latitude: number
      longitude: number
    }) => void
    focusRequest?: {
      point: { latitude: number; longitude: number }
      nonce: number
    } | null
  }) => {
    mapProps.push({
      selectedPoint: props.selectedPoint,
      focusRequest: props.focusRequest ?? null,
    })
    return (
      <div aria-label="Mapa interactivo de Colombia">
        <button
          type="button"
          onClick={() =>
            props.onSelectPoint({ latitude: 6.2442, longitude: -75.5812 })
          }
        >
          Simular clic mapa
        </button>
      </div>
    )
  },
}))

vi.mock('../hooks/useLocationContextQuery', () => ({
  useLocationContextQuery: () => ({
    data: undefined,
    error: null,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))

import { HomePage } from './HomePage'

describe('HomePage geolocalización', () => {
  beforeEach(() => {
    mapProps.length = 0
    vi.restoreAllMocks()
  })

  it('al usar mi ubicación actualiza selección y solicita enfoque del mapa', async () => {
    const user = userEvent.setup()
    vi.spyOn(geolocationService, 'getCurrentPosition').mockResolvedValue({
      latitude: 4.711,
      longitude: -74.0721,
      accuracy: 18,
    })

    render(
      <QueryProvider>
        <HomePage />
      </QueryProvider>,
    )

    await user.click(
      screen.getByRole('button', { name: /Usar mi ubicación/i }),
    )

    await waitFor(() => {
      const last = mapProps.at(-1)
      expect(last?.selectedPoint).toEqual({
        latitude: 4.711,
        longitude: -74.0721,
      })
      expect(last?.focusRequest?.point).toEqual({
        latitude: 4.711,
        longitude: -74.0721,
      })
      expect(last?.focusRequest?.nonce).toBeGreaterThan(0)
    })
  })

  it('muestra error de permiso denegado sin inventar selección', async () => {
    const user = userEvent.setup()
    vi.spyOn(geolocationService, 'getCurrentPosition').mockRejectedValue(
      new geolocationService.GeolocationServiceError('permission_denied'),
    )

    render(
      <QueryProvider>
        <HomePage />
      </QueryProvider>,
    )

    await user.click(
      screen.getByRole('button', { name: /Usar mi ubicación/i }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(/permiso denegado/i)
    expect(mapProps.at(-1)?.selectedPoint).toBeNull()
  })

  it('una selección manual invalida una geolocalización tardía', async () => {
    const user = userEvent.setup()
    let resolvePosition!: (
      value: geolocationService.GeolocationCoords,
    ) => void

    vi.spyOn(geolocationService, 'getCurrentPosition').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePosition = resolve
        }),
    )

    render(
      <QueryProvider>
        <HomePage />
      </QueryProvider>,
    )

    await user.click(
      screen.getByRole('button', { name: /Usar mi ubicación/i }),
    )
    await user.click(screen.getByRole('button', { name: /Simular clic mapa/i }))

    await waitFor(() => {
      expect(mapProps.at(-1)?.selectedPoint).toEqual({
        latitude: 6.2442,
        longitude: -75.5812,
      })
    })

    resolvePosition({
      latitude: 4.711,
      longitude: -74.0721,
      accuracy: 10,
    })

    await waitFor(() => {
      expect(mapProps.at(-1)?.selectedPoint).toEqual({
        latitude: 6.2442,
        longitude: -75.5812,
      })
    })
  })
})
