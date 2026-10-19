import type { ReactNode } from 'react'
import type { SectionUiState } from '../types/location'

interface SectionCardProps {
  title: string
  subtitle?: string
  state: SectionUiState
  children?: ReactNode
  emptyMessage?: string
  unavailableMessage?: string
  footer?: ReactNode
}

const STATE_BADGE: Partial<
  Record<SectionUiState, { label: string; className: string }>
> = {
  available: {
    label: 'Disponible',
    className: 'border-geo-accent/40 bg-geo-accent/15 text-geo-accent',
  },
  empty_ok: {
    label: 'Sin resultados',
    className: 'border-white/15 bg-white/5 text-geo-mist',
  },
  source_unavailable: {
    label: 'No disponible',
    className: 'border-amber-400/35 bg-amber-400/10 text-amber-200',
  },
  loading: {
    label: 'Cargando',
    className: 'border-white/15 bg-white/5 text-geo-mist',
  },
  error: {
    label: 'Error',
    className: 'border-red-400/40 bg-red-400/10 text-red-200',
  },
}

export function SectionCard({
  title,
  subtitle,
  state,
  children,
  emptyMessage = 'Sin resultados para este punto.',
  unavailableMessage = 'Fuente temporalmente no disponible.',
  footer,
}: SectionCardProps) {
  const badge = STATE_BADGE[state]

  return (
    <section className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 sm:px-4 sm:py-3.5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-geo-fog">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-geo-mist/70">{subtitle}</p>
          ) : null}
        </div>
        {badge ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
          >
            {badge.label}
          </span>
        ) : null}
      </header>

      <div className="mt-3">
        {state === 'loading' ? (
          <div className="space-y-2" aria-hidden="true">
            <div className="h-3 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
          </div>
        ) : null}

        {state === 'source_unavailable' ? (
          <p className="text-sm leading-relaxed text-amber-100/85">
            {unavailableMessage}
          </p>
        ) : null}

        {state === 'empty_ok' ? (
          <p className="text-sm leading-relaxed text-geo-mist/85">
            {emptyMessage}
          </p>
        ) : null}

        {state === 'available' ? children : null}

        {state === 'error' ? (
          <p className="text-sm text-red-100/85">
            No se pudo mostrar esta sección.
          </p>
        ) : null}
      </div>

      {footer && state === 'available' ? (
        <div className="mt-3 border-t border-white/8 pt-2.5">{footer}</div>
      ) : null}
    </section>
  )
}
