import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../api/errors'
import {
  NATIONAL_PRECISION_BANNER,
  REGIONAL_PRECISION_BANNER,
} from '../../../utils/alertLayerMode'
import { AlertLayerStatusBanner } from './AlertLayerStatusBanner'

describe('AlertLayerStatusBanner', () => {
  it('muestra aviso de precisión en vista nacional', () => {
    render(
      <AlertLayerStatusBanner
        anyEnabled
        enabled={{
          hydrological: true,
          landslides: false,
          fires: false,
        }}
        viewMode={{
          mode: 'national',
          bbox: '-79,-4,-67,13',
          spanLon: 12,
          spanLat: 17,
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
                features: [
                  {
                    type: 'Feature',
                    geometry: {
                      type: 'Polygon',
                      coordinates: [
                        [
                          [-75, 4],
                          [-74, 4],
                          [-74, 5],
                          [-75, 5],
                          [-75, 4],
                        ],
                      ],
                    },
                    properties: {
                      object_id: 1,
                      layer_type: 'hydrological',
                      level: 2,
                      level_key: 'orange',
                      level_label: 'ALERTA NARANJA',
                      name: 'Zona',
                      source: 'IDEAM',
                    },
                  },
                ],
                mode: 'national',
              },
            },
          },
        ]}
      />,
    )

    expect(screen.getByText(NATIONAL_PRECISION_BANNER)).toBeInTheDocument()
  })

  it('muestra aviso de precisión en vista regional', () => {
    render(
      <AlertLayerStatusBanner
        anyEnabled
        enabled={{
          hydrological: true,
          landslides: false,
          fires: false,
        }}
        viewMode={{
          mode: 'regional',
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
                features: [
                  {
                    type: 'Feature',
                    geometry: {
                      type: 'Polygon',
                      coordinates: [
                        [
                          [-75.3, 4.4],
                          [-75.2, 4.4],
                          [-75.2, 4.5],
                          [-75.3, 4.5],
                          [-75.3, 4.4],
                        ],
                      ],
                    },
                    properties: {
                      object_id: 1,
                      layer_type: 'hydrological',
                      level: 1,
                      level_key: 'yellow',
                      level_label: 'ALERTA AMARILLA',
                      name: 'Río',
                      source: 'IDEAM',
                    },
                  },
                ],
              },
            },
          },
        ]}
      />,
    )

    expect(screen.getByText(REGIONAL_PRECISION_BANNER)).toBeInTheDocument()
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
        viewMode={{
          mode: 'regional',
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

  it('muestra fuera de cobertura como unavailable', () => {
    render(
      <AlertLayerStatusBanner
        anyEnabled
        enabled={{
          hydrological: true,
          landslides: false,
          fires: false,
        }}
        viewMode={{
          mode: 'unavailable',
          reason: 'out_of_coverage',
          message: 'El área visible está fuera de la cobertura de alertas IDEAM.',
        }}
        layers={[]}
      />,
    )

    expect(
      screen.getByText(/fuera de la cobertura/i),
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
        viewMode={{ mode: 'unavailable', reason: 'invalid', message: 'x' }}
        layers={[]}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
