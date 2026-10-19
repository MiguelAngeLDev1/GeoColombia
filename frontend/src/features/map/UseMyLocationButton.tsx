interface UseMyLocationButtonProps {
  onClick: () => void
  isPending?: boolean
  disabled?: boolean
}

/** Botón explícito para solicitar la ubicación del navegador. */
export function UseMyLocationButton({
  onClick,
  isPending = false,
  disabled = false,
}: UseMyLocationButtonProps) {
  const isDisabled = disabled || isPending

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isPending}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-geo-accent/45 bg-geo-forest/55 px-3 py-2 text-sm font-medium text-geo-fog transition hover:border-geo-accent/70 hover:bg-geo-forest/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-geo-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LocationPinIcon className="h-4 w-4 text-geo-accent" />
      <span>{isPending ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}</span>
    </button>
  )
}

function LocationPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 22s7-7.2 7-12.2A7 7 0 0 0 5 9.8C5 14.8 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}
