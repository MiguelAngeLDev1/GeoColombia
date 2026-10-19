import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FireAlertsPanel } from './FireAlertsPanel'
import { HydrologicalAlertsPanel } from './HydrologicalAlertsPanel'
import { LandslideAlertsPanel } from './LandslideAlertsPanel'

describe('IDEAM alert panels', () => {
  it('muestra alerta hidrológica con nivel textual', () => {
    render(
      <HydrologicalAlertsPanel
        alerts={{
          source: 'IDEAM',
          hydrological: {
            has_alerts: true,
            count: 1,
            alerts: [
              {
                id: 1,
                level: 'orange',
                level_label: 'NARANJA',
                department: 'TOLIMA',
                hydrographic_subzone: 'Río Magdalena',
              },
            ],
          },
        }}
        unavailableSources={[]}
      />,
    )

    expect(screen.getByText('NARANJA')).toBeInTheDocument()
    expect(screen.getByText(/TOLIMA/)).toBeInTheDocument()
  })

  it('has_alerts=false muestra Sin amenaza reportada', () => {
    render(
      <LandslideAlertsPanel
        alerts={{
          source: 'IDEAM',
          landslides: { has_alerts: false, count: 0, alerts: [] },
        }}
        unavailableSources={[]}
      />,
    )

    expect(screen.getByText('Sin amenaza reportada')).toBeInTheDocument()
  })

  it('componente null muestra Información no disponible', () => {
    render(
      <FireAlertsPanel
        alerts={{
          source: 'IDEAM',
          fires: null,
        }}
        unavailableSources={[
          {
            service: 'IDEAM',
            component: 'fire_alerts',
            message: 'timeout',
          },
        ]}
      />,
    )

    expect(screen.getByText('Información no disponible')).toBeInTheDocument()
    expect(screen.getByText(/no es un incendio activo/i)).toBeInTheDocument()
  })

  it('nivel unknown tiene representación textual', () => {
    render(
      <LandslideAlertsPanel
        alerts={{
          source: 'IDEAM',
          landslides: {
            has_alerts: true,
            count: 1,
            alerts: [{ id: 9, level: 'unknown' }],
          },
        }}
        unavailableSources={[]}
      />,
    )

    expect(screen.getByText(/Nivel desconocido/i)).toBeInTheDocument()
    expect(screen.getByText(/no es un incidente activo/i)).toBeInTheDocument()
  })
})
