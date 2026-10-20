import { MAGNITUDE_STYLES } from '../../../utils/earthquakeMagnitudeStyles'

interface SeismicLayerLegendProps {
  visible: boolean
}

/** Leyenda de magnitudes (separada de niveles IDEAM). */
export function SeismicLayerLegend({ visible }: SeismicLayerLegendProps) {
  if (!visible) {
    return null
  }

  return (
    <aside
      className="geo-seismic-layer-legend pointer-events-none absolute bottom-8 left-2 z-[1000] max-w-[11.5rem] rounded-xl border border-white/15 bg-geo-ink/90 px-2.5 py-2 text-[10px] text-geo-mist shadow-lg backdrop-blur-sm sm:bottom-10 sm:left-3 sm:max-w-[13rem] sm:text-[11px]"
      aria-label="Leyenda de magnitudes sísmicas"
    >
      <p className="font-semibold text-geo-fog">Magnitud (SGC)</p>
      <ul className="mt-1.5 space-y-1">
        {Object.values(MAGNITUDE_STYLES).map((style) => (
          <li key={style.band} className="flex items-center gap-2">
            <span
              className="inline-block shrink-0 rounded-full border"
              style={{
                width: style.radius * 1.4,
                height: style.radius * 1.4,
                backgroundColor: style.fillColor,
                borderColor: style.color,
              }}
              aria-hidden="true"
            />
            <span>{style.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 leading-snug text-geo-mist/80">
        Epicentros de Sismos Sentidos. No es una alerta sísmica.
      </p>
    </aside>
  )
}
