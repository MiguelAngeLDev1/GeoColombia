import type { AlertLevel } from '../../types/location'
import { getAlertLevelPresentation } from '../../utils/alertLevels'

interface AlertLevelBadgeProps {
  level: AlertLevel
  levelLabel?: string | null
}

/** Nivel con color + texto (nunca solo color). */
export function AlertLevelBadge({
  level,
  levelLabel,
}: AlertLevelBadgeProps) {
  const presentation = getAlertLevelPresentation(level)
  const trimmedLabel = levelLabel?.trim() ?? ''
  const visibleLabel = trimmedLabel || presentation.label
  const needsAccessibleLevel =
    trimmedLabel.length > 0 &&
    trimmedLabel.toLowerCase() !== presentation.label.toLowerCase()

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${presentation.className}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      <span>{visibleLabel}</span>
      {needsAccessibleLevel ? (
        <span className="sr-only">({presentation.label})</span>
      ) : null}
    </span>
  )
}
