import type { AlertLayerType } from '../../../api/alertLayerSchemas'
import type { AlertLayerToggleState } from '../../../hooks/useAlertLayerToggles'
import { ALERT_LAYER_LABELS } from '../../../utils/alertLayerStyles'

const LAYER_ORDER: AlertLayerType[] = [
  'hydrological',
  'landslides',
  'fires',
]

interface AlertLayerControlsProps {
  enabled: AlertLayerToggleState
  onToggle: (layerType: AlertLayerType) => void
}

/**
 * Controles independientes para capas IDEAM (escritorio y móvil).
 */
export function AlertLayerControls({
  enabled,
  onToggle,
}: AlertLayerControlsProps) {
  return (
    <fieldset
      className="geo-alert-layer-controls pointer-events-auto max-w-[min(100%-1rem,16.5rem)] rounded-xl border border-white/15 bg-geo-ink/90 p-2 shadow-lg backdrop-blur-sm sm:max-w-[18rem] sm:p-2.5"
      aria-label="Capas de alertas IDEAM"
    >
      <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-geo-accent sm:text-[11px]">
        Capas IDEAM
      </legend>
      <div className="mt-1 flex flex-col gap-1">
        {LAYER_ORDER.map((layerType) => {
          const id = `alert-layer-${layerType}`
          const isOn = enabled[layerType]

          return (
            <label
              key={layerType}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 text-left text-xs text-geo-fog hover:bg-white/5 sm:text-sm"
            >
              <input
                id={id}
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-geo-accent"
                checked={isOn}
                onChange={() => onToggle(layerType)}
              />
              <span className="leading-snug">
                {ALERT_LAYER_LABELS[layerType]}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
