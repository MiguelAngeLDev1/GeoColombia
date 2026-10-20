interface SeismicLayerControlsProps {
  enabled: boolean
  onToggle: () => void
}

/** Control independiente de la capa nacional de sismos SGC. */
export function SeismicLayerControls({
  enabled,
  onToggle,
}: SeismicLayerControlsProps) {
  return (
    <fieldset
      className="geo-seismic-layer-controls pointer-events-auto rounded-xl border border-white/15 bg-geo-ink/90 p-2 shadow-lg backdrop-blur-sm sm:p-2.5"
      aria-label="Capa de sismos recientes"
    >
      <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-geo-accent sm:text-[11px]">
        Sismos SGC
      </legend>
      <label
        htmlFor="seismic-layer-recent"
        className="mt-1 flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 text-left text-xs text-geo-fog hover:bg-white/5 sm:text-sm"
      >
        <input
          id="seismic-layer-recent"
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-geo-accent"
          checked={enabled}
          onChange={onToggle}
        />
        <span className="leading-snug">
          Sismos recientes
          <span className="mt-0.5 block text-[10px] font-normal text-geo-mist/70">
            Últimos eventos del listado SGC (hasta 100)
          </span>
        </span>
      </label>
    </fieldset>
  )
}
