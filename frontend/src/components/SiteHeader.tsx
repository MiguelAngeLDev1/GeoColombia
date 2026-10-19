import { BrandMark } from './BrandMark'

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-white/10 bg-geo-ink/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a
          href="/"
          className="group inline-flex items-center gap-3 text-geo-fog transition-opacity hover:opacity-90"
          aria-label="GeoColombia — inicio"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full border border-geo-accent/40 bg-geo-forest/60 shadow-[0_0_24px_rgba(61,139,116,0.25)]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-geo-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <circle cx="12" cy="12" r="8.25" />
              <path d="M4.5 12h15M12 4.5c2.4 2.7 2.4 12.3 0 15M12 4.5c-2.4 2.7-2.4 12.3 0 15" />
            </svg>
          </span>
          <BrandMark className="text-lg text-geo-fog sm:text-xl" />
        </a>

        <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-geo-mist/80 sm:block">
          Exploración territorial
        </p>
      </div>
    </header>
  )
}
