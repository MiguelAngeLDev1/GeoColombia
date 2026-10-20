import { ALERT_LEVEL_STYLES } from '../../../utils/alertLayerStyles'

interface AlertLayerLegendProps {
  visible: boolean
  /** Sube la leyenda cuando también hay leyenda de magnitudes SGC. */
  offsetForSeismicLegend?: boolean
}

/** Leyenda compacta de niveles IDEAM (sin afirmar tiempo real). */
export function AlertLayerLegend({
  visible,
  offsetForSeismicLegend = false,
}: AlertLayerLegendProps) {
  if (!visible) {
    return null
  }

  return (
    <aside
      className={`geo-alert-layer-legend pointer-events-none absolute left-2 z-[1000] max-w-[11.5rem] rounded-xl border border-white/15 bg-geo-ink/90 px-2.5 py-2 text-[10px] text-geo-mist shadow-lg backdrop-blur-sm sm:left-3 sm:max-w-[13rem] sm:text-[11px] ${
        offsetForSeismicLegend
          ? 'bottom-[9.75rem] sm:bottom-[11rem]'
          : 'bottom-8 sm:bottom-10'
      }`}
      aria-label="Leyenda de alertas IDEAM"
    >
      <p className="font-semibold text-geo-fog">Niveles IDEAM</p>
      <ul className="mt-1.5 space-y-1">
        {Object.values(ALERT_LEVEL_STYLES).map((style) => (
          <li key={style.level} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border"
              style={{
                backgroundColor: style.fillColor,
                borderColor: style.color,
                opacity: 0.95,
              }}
              aria-hidden="true"
            />
            <span>{style.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 leading-snug text-geo-mist/80">
        Datos oficiales IDEAM. No implica actualización en tiempo real.
      </p>
    </aside>
  )
}
