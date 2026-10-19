import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeatherPanel } from './WeatherPanel'

describe('WeatherPanel', () => {
  it('traduce condiciones en inglés y muestra próximas horas', () => {
    render(
      <WeatherPanel
        weather={{
          source: 'Open-Meteo',
          timezone: 'America/Bogota',
          current: {
            observed_at: '2024-06-15T14:00:00-05:00',
            temperature_c: 22,
            feels_like_c: 23,
            condition: 'Partly cloudy',
            humidity_percent: 70,
            precipitation_mm: 0.2,
            is_raining: false,
            wind_speed_kmh: 8,
          },
          next_hours: [
            {
              time: '2024-06-15T15:00:00-05:00',
              temperature_c: 21,
              condition: 'Overcast',
              precipitation_probability_percent: 40,
              rain_mm: 0,
            },
          ],
        }}
        unavailableSources={[]}
      />,
    )

    expect(screen.getByText(/22/)).toBeInTheDocument()
    expect(screen.getByText('Parcialmente nublado')).toBeInTheDocument()
    expect(screen.getByText(/Nublado/)).toBeInTheDocument()
    expect(screen.getByText('Próximas horas')).toBeInTheDocument()
    expect(screen.getByText('Fuente: Open-Meteo')).toBeInTheDocument()
    expect(screen.queryByText('Partly cloudy')).not.toBeInTheDocument()
  })
})
