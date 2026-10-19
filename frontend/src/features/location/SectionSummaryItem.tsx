import type { SectionSummary } from '../../services/locationSummaries'

const STATE_STYLES: Record<
  SectionSummary['state'],
  { badge: string; label: string }
> = {
  available: {
    badge: 'border-geo-accent/40 bg-geo-accent/15 text-geo-accent',
    label: 'Disponible',
  },
  empty_ok: {
    badge: 'border-white/15 bg-white/5 text-geo-mist',
    label: 'Sin resultados',
  },
  source_unavailable: {
    badge: 'border-amber-400/35 bg-amber-400/10 text-amber-200',
    label: 'No disponible',
  },
}

interface SectionSummaryItemProps {
  summary: SectionSummary
}

export function SectionSummaryItem({ summary }: SectionSummaryItemProps) {
  const style = STATE_STYLES[summary.state]

  return (
    <li className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-geo-fog">{summary.label}</p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
        >
          {style.label}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-geo-mist/85">
        {summary.detail}
      </p>
    </li>
  )
}
