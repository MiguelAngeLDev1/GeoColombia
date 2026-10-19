import { BrandMark } from '../components/BrandMark'
import { SiteHeader } from '../components/SiteHeader'
import { LocationResultsPanel } from '../features/location/LocationResultsPanel'
import { MapView } from '../features/map/MapView'
import { SelectionStatus } from '../features/map/SelectionStatus'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useLocationContextQuery } from '../hooks/useLocationContextQuery'
import { useMapSelection } from '../hooks/useMapSelection'

export function HomePage() {
  useDocumentTitle('GeoColombia — Descubre qué está pasando en Colombia')
  const { selectedPoint, selectPoint } = useMapSelection()
  const locationQuery = useLocationContextQuery(selectedPoint)

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
            Selecciona un punto en el mapa para consultar territorio, clima,
            sismos y alertas oficiales.
          </p>
        </section>

        <SelectionStatus selectedPoint={selectedPoint} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.9fr)] lg:items-start lg:gap-5">
          <MapView
            selectedPoint={selectedPoint}
            onSelectPoint={selectPoint}
          />

          <div className="lg:sticky lg:top-4">
            <LocationResultsPanel
              selectedPoint={selectedPoint}
              query={locationQuery}
            />
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-5 text-center text-xs text-geo-mist/55">
        GeoColombia · Fuentes oficiales colombianas
      </footer>
    </div>
  )
}
