import { DataRow } from '../../components/DataRow'
import { SectionCard } from '../../components/SectionCard'
import {
  resolveWeatherSection,
  unavailableMessageFor,
} from '../../services/contextSections'
import type {
  UnavailableSource,
  WeatherContext,
} from '../../types/location'
import { formatDateTime, formatHourLabel } from '../../utils/formatDateTime'
import {
  formatPercent,
  formatPrecipitationMm,
  formatSpeedKmh,
  formatTemperatureC,
} from '../../utils/formatUnits'
import { translateWeatherCondition } from '../../utils/translateWeatherCondition'

interface WeatherPanelProps {
  weather: WeatherContext | null | undefined
  unavailableSources: UnavailableSource[]
}

export function WeatherPanel({
  weather,
  unavailableSources,
}: WeatherPanelProps) {
  const state = resolveWeatherSection(weather, unavailableSources)
  const current = weather?.current
  const timeZone = weather?.timezone
  const observedAt = formatDateTime(current?.observed_at, timeZone)
  const conditionLabel = translateWeatherCondition(current?.condition)

  return (
    <SectionCard
      title="Clima"
      subtitle={`Fuente: ${weather?.source ?? 'Open-Meteo'}`}
      state={state}
      unavailableMessage={unavailableMessageFor(
        unavailableSources,
        'weather',
      )}
    >
      <div className="space-y-3">
        <div>
          <p className="font-display text-2xl text-geo-fog">
            {formatTemperatureC(current?.temperature_c) ?? '—'}
          </p>
          {conditionLabel ? (
            <p className="mt-0.5 text-sm text-geo-mist">{conditionLabel}</p>
          ) : null}
          {observedAt ? (
            <p className="mt-1 text-xs leading-snug text-geo-mist/65">
              Observación: {observedAt}
              {timeZone ? ` · ${timeZone}` : ''}
            </p>
          ) : timeZone ? (
            <p className="mt-1 text-xs text-geo-mist/65">
              Zona horaria: {timeZone}
            </p>
          ) : null}
        </div>

        <dl className="space-y-2">
          <DataRow
            label="Sensación térmica"
            value={formatTemperatureC(current?.feels_like_c)}
          />
          <DataRow
            label="Humedad"
            value={formatPercent(current?.humidity_percent)}
          />
          <DataRow
            label="Viento"
            value={formatSpeedKmh(current?.wind_speed_kmh)}
          />
          <DataRow
            label="Precipitación"
            value={formatPrecipitationMm(current?.precipitation_mm)}
          />
          <DataRow
            label="¿Llueve?"
            value={
              current
                ? current.is_raining
                  ? 'Sí'
                  : 'No'
                : null
            }
          />
        </dl>

        {weather && weather.next_hours.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-geo-mist/70">
              Próximas horas
            </p>
            <ul className="mt-2 divide-y divide-white/8 rounded-lg border border-white/8">
              {weather.next_hours.slice(0, 6).map((hour) => {
                const hourLabel = formatHourLabel(hour.time, timeZone)
                const hourCondition = translateWeatherCondition(hour.condition)
                return (
                  <li
                    key={hour.time}
                    className="grid grid-cols-[auto_1fr] items-start gap-3 px-2.5 py-2 text-sm"
                  >
                    <span className="shrink-0 whitespace-nowrap font-mono text-geo-mist">
                      {hourLabel ?? '—'}
                    </span>
                    <span className="min-w-0 text-right text-geo-fog">
                      {[
                        formatTemperatureC(hour.temperature_c),
                        hourCondition,
                        hour.precipitation_probability_percent != null
                          ? `Lluvia ${hour.precipitation_probability_percent}%`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-geo-mist/60">
              Pronóstico horario según Open-Meteo para la coordenada
              consultada.
            </p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}
