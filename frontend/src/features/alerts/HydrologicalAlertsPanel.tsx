import { SectionCard } from '../../components/SectionCard'
import {
  resolveAlertBucketSection,
  unavailableMessageFor,
} from '../../services/contextSections'
import type {
  AlertsContext,
  UnavailableSource,
} from '../../types/location'
import { AlertLevelBadge } from './AlertLevelBadge'

interface HydrologicalAlertsPanelProps {
  alerts: AlertsContext | null | undefined
  unavailableSources: UnavailableSource[]
}

export function HydrologicalAlertsPanel({
  alerts,
  unavailableSources,
}: HydrologicalAlertsPanelProps) {
  const state = resolveAlertBucketSection(
    alerts,
    'hydrological',
    'hydrological_alerts',
    unavailableSources,
  )
  const bucket = alerts?.hydrological

  return (
    <SectionCard
      title="Alertas hidrológicas"
      subtitle="IDEAM · condiciones hidrológicas"
      state={state}
      emptyMessage="Sin alertas hidrológicas vigentes para este punto."
      unavailableMessage={unavailableMessageFor(
        unavailableSources,
        'hydrological_alerts',
      )}
    >
      <ul className="space-y-2.5">
        {bucket?.alerts.map((alert, index) => (
          <li
            key={alert.id ?? `${alert.level}-${index}`}
            className="rounded-lg border border-white/8 bg-geo-ink/25 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <AlertLevelBadge
                level={alert.level}
                levelLabel={alert.level_label}
              />
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              {alert.department ? (
                <div className="text-geo-mist">
                  <span className="text-geo-mist/65">Departamento: </span>
                  {alert.department}
                </div>
              ) : null}
              {alert.hydrographic_subzone ? (
                <div className="text-geo-mist">
                  <span className="text-geo-mist/65">Subzona: </span>
                  {alert.hydrographic_subzone}
                </div>
              ) : null}
              {alert.hydrographic_zone ? (
                <div className="text-geo-mist">
                  <span className="text-geo-mist/65">Zona: </span>
                  {alert.hydrographic_zone}
                </div>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
