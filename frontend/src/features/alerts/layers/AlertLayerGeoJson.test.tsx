import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const onEachHandlers: Array<{
  click?: (event: {
    originalEvent?: Event
  }) => void
}> = []

const { stopPropagation, stop } = vi.hoisted(() => ({
  stopPropagation: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('leaflet', () => ({
  default: {
    DomEvent: {
      stopPropagation,
      stop,
    },
  },
}))

vi.mock('react-leaflet', () => ({
  GeoJSON: ({
    data,
    onEachFeature,
    style,
  }: {
    data: { features: Array<{ properties: { level: number; name?: string } }> }
    onEachFeature?: (
      feature: { properties: { level: number; name?: string; layer_type: string; level_key: string; level_label: string; object_id: number; source: 'IDEAM' } },
      layer: {
        bindPopup: (html: string) => void
        on: (handlers: { click?: (event: { originalEvent?: Event }) => void }) => void
      },
    ) => void
    style?: (feature?: { properties?: { level: number } }) => unknown
    children?: ReactNode
  }) => {
    for (const feature of data.features) {
      const layer = {
        bindPopup: vi.fn(),
        on: (handlers: { click?: (event: { originalEvent?: Event }) => void }) => {
          onEachHandlers.push(handlers)
        },
      }
      onEachFeature?.(
        {
          properties: {
            object_id: 1,
            layer_type: 'hydrological',
            level: feature.properties.level,
            level_key: 'orange',
            level_label: 'ALERTA NARANJA',
            name: feature.properties.name ?? 'Zona',
            source: 'IDEAM',
          },
        },
        layer,
      )
      style?.({ properties: { level: feature.properties.level } })
    }

    return (
      <div
        data-testid="alert-geojson"
        data-count={String(data.features.length)}
      />
    )
  },
}))

import { AlertLayerGeoJson } from './AlertLayerGeoJson'

describe('AlertLayerGeoJson', () => {
  it('renderiza features activas Polygon y omite nivel 0', () => {
    onEachHandlers.length = 0

    render(
      <AlertLayerGeoJson
        layerType="hydrological"
        viewportKey="-75.4,4.3,-75.05,4.55"
        data={{
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
                level: 2,
                level_key: 'orange',
                level_label: 'ALERTA NARANJA',
                name: 'Río Coello',
                source: 'IDEAM',
              },
            },
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
                object_id: 2,
                layer_type: 'hydrological',
                level: 0,
                level_key: 'unknown',
                level_label: 'SIN AMENAZA',
                name: 'Ignorado',
                source: 'IDEAM',
              },
            },
          ],
        }}
      />,
    )

    expect(screen.getByTestId('alert-geojson')).toHaveAttribute(
      'data-count',
      '1',
    )
  })

  it('detiene la propagación del clic sobre el polígono', () => {
    onEachHandlers.length = 0
    stopPropagation.mockClear()
    stop.mockClear()

    render(
      <AlertLayerGeoJson
        layerType="landslides"
        viewportKey="-75.4,4.3,-75.05,4.55"
        data={{
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'MultiPolygon',
                coordinates: [
                  [
                    [
                      [-75.3, 4.4],
                      [-75.2, 4.4],
                      [-75.2, 4.5],
                      [-75.3, 4.5],
                      [-75.3, 4.4],
                    ],
                  ],
                ],
              },
              properties: {
                object_id: 3,
                layer_type: 'landslides',
                level: 1,
                level_key: 'yellow',
                level_label: 'AMENAZA BAJA',
                name: 'Ibagué',
                source: 'IDEAM',
              },
            },
          ],
        }}
      />,
    )

    const handlers = onEachHandlers[0]
    const originalEvent = new Event('click')
    handlers?.click?.({ originalEvent })

    expect(stopPropagation).toHaveBeenCalled()
    expect(stop).toHaveBeenCalledWith(originalEvent)
  })
})
