import { SectionCard } from '../../components/SectionCard'
import { resolveAlertBucketSection } from '../../services/contextSections'
import type {
  AlertsContext,
  UnavailableSource,
} from '../../types/location'
import { AlertLevelBadge } from './AlertLevelBadge'

interface LandslideAlertsPanelProps {
  alerts: AlertsContext | null | undefined
  unavailableSources: UnavailableSource[]
}

export function LandslideAlertsPanel({
  alerts,
  unavailableSources,
}: LandslideAlertsPanelProps) {
  const state = resolveAlertBucketSection(
    alerts,
    'landslides',
    'landslide_alerts',
    unavailableSources,
  )
  const bucket = alerts?.landslides

  return (
    <SectionCard
      title="Amenaza por remoción en masa"
      subtitle="IDEAM · pronóstico municipal (no es un incidente activo)"
      state={state}
      emptyMessage="Sin amenaza reportada"
      unavailableMessage="Información no disponible"
    >
      <ul className="space-y-2.5">
        {bucket?.alerts.map((alert, index) => (
          <li
            key={alert.id ?? `${alert.level}-${index}`}
            className="rounded-lg border border-white/8 bg-geo-ink/25 px-3 py-2.5"
          >
            <AlertLevelBadge
              level={alert.level}
              levelLabel={alert.level_label}
            />
            <dl className="mt-2 space-y-1 text-sm text-geo-mist">
              {alert.municipality ? (
                <div>
                  <span className="text-geo-mist/65">Municipio: </span>
                  {alert.municipality}
                </div>
              ) : null}
              {alert.department ? (
                <div>
                  <span className="text-geo-mist/65">Departamento: </span>
                  {alert.department}
                </div>
              ) : null}
              {alert.region ? (
                <div>
                  <span className="text-geo-mist/65">Región: </span>
                  {alert.region}
                </div>
              ) : null}
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-geo-mist/60">
              Pronóstico de amenaza municipal. No indica un deslizamiento en
              curso.
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
