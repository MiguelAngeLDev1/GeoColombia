interface BrandMarkProps {
  className?: string
}

/** Marca tipográfica GeoColombia para encabezados y hero. */
export function BrandMark({ className = '' }: BrandMarkProps) {
  return (
    <span
      className={`font-display tracking-tight ${className}`}
      aria-label="GeoColombia"
    >
      <span aria-hidden="true">
        Geo<span className="text-geo-accent">Colombia</span>
      </span>
    </span>
  )
}
