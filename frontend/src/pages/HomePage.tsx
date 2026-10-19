import { BrandMark } from '../components/BrandMark'
import { SiteHeader } from '../components/SiteHeader'
import { MapView } from '../features/map/MapView'
import { SelectionStatus } from '../features/map/SelectionStatus'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useMapSelection } from '../hooks/useMapSelection'

export function HomePage() {
  useDocumentTitle('GeoColombia — Descubre qué está pasando en Colombia')
  const { selectedPoint, selectPoint } = useMapSelection()

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-geo-ink text-geo-fog">
      <div className="geo-atmosphere" aria-hidden="true" />
      <div className="geo-topo-grid" aria-hidden="true" />

      <SiteHeader />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-5 px-5 pb-12 pt-6 sm:gap-6 sm:px-8 sm:pt-8 lg:gap-7 lg:pb-16 lg:pt-10">
        <section className="max-w-3xl space-y-2.5 sm:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-geo-accent">
            Información territorial de Colombia
          </p>

          <h1 className="font-display text-[1.85rem] leading-[1.08] text-geo-fog sm:text-4xl lg:text-[2.75rem]">
            <BrandMark />
          </h1>

          <p className="max-w-2xl font-display text-lg leading-snug text-geo-mist sm:text-xl lg:text-2xl">
            Descubre qué está pasando en Colombia.
          </p>

          <p className="max-w-xl text-sm leading-relaxed text-geo-mist/80 sm:text-base">
            Selecciona un punto en el mapa. Pronto podrás consultar territorio,
            clima, sismos y alertas oficiales para esa ubicación.
          </p>
        </section>

        <SelectionStatus selectedPoint={selectedPoint} />

        <MapView
          selectedPoint={selectedPoint}
          onSelectPoint={selectPoint}
        />

        <section
          aria-label="Fuentes previstas"
          className="grid gap-3 border-t border-white/10 pt-6 text-sm text-geo-mist/75 sm:grid-cols-2 lg:grid-cols-4"
        >
          <SourceHint label="Territorio" detail="Marco DANE" />
          <SourceHint label="Clima" detail="Condiciones y pronóstico" />
          <SourceHint label="Sismos" detail="Catálogo SGC" />
          <SourceHint label="Alertas" detail="IDEAM oficial" />
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-5 text-center text-xs text-geo-mist/55">
        GeoColombia · Fuentes oficiales colombianas
      </footer>
    </div>
  )
}

function SourceHint({
  label,
  detail,
}: {
  label: string
  detail: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <p className="font-medium text-geo-fog/90">{label}</p>
      <p className="mt-0.5 text-geo-mist/65">{detail}</p>
    </div>
  )
}
