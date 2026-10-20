import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../api/errors'
import { AlertLayerStatusBanner } from './AlertLayerStatusBanner'

describe('AlertLayerStatusBanner', () => {
  it('muestra zoom guard cuando el viewport es demasiado grande', () => {
    render(
      <AlertLayerStatusBanner
        anyEnabled
        enabled={{
          hydrological: true,
          landslides: false,
          fires: false,
        }}
        eligibility={{
          status: 'too_large',
          bbox: '-79,-4,-67,13',
          spanLon: 12,
          spanLat: 17,
          message: 'Acércate para visualizar las alertas',
        }}
        layers={[]}
      />,
    )

    expect(
      screen.getByText('Acércate para visualizar las alertas'),
    ).toBeInTheDocument()
  })

  it('muestra estados vacíos y errores 413/502 por capa', () => {
    render(
      <AlertLayerStatusBanner
        anyEnabled
        enabled={{
          hydrological: true,
          landslides: true,
          fires: true,
        }}
        eligibility={{
          status: 'ok',
          bbox: '-75.4,4.3,-75.05,4.55',
          spanLon: 0.35,
          spanLat: 0.25,
        }}
        layers={[
          {
            layerType: 'hydrological',
            enabled: true,
            query: {
              isFetching: false,
              isError: false,
              error: null,
              isSuccess: true,
              data: {
                type: 'FeatureCollection',
                features: [],
              },
            },
          },
          {
            layerType: 'landslides',
            enabled: true,
            query: {
              isFetching: false,
              isError: true,
              error: new ApiError('http', 413, 'Respuesta demasiado grande'),
              isSuccess: false,
              data: undefined,
            },
          },
          {
            layerType: 'fires',
            enabled: true,
            query: {
              isFetching: false,
              isError: true,
              error: new ApiError('http', 502, 'Fallo IDEAM'),
              isSuccess: false,
              data: undefined,
            },
          },
        ]}
      />,
    )

    expect(
      screen.getByText(/Alertas hidrológicas: sin entidades/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Amenaza por deslizamientos: Respuesta demasiado grande/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Amenaza por incendios: Fallo IDEAM/),
    ).toBeInTheDocument()
  })

  it('no muestra nada si todas las capas están desactivadas', () => {
    const { container } = render(
      <AlertLayerStatusBanner
        anyEnabled={false}
        enabled={{
          hydrological: false,
          landslides: false,
          fires: false,
        }}
        eligibility={{ status: 'invalid', message: 'x' }}
        layers={[]}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
