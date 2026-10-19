interface DataRowProps {
  label: string
  value: string | null | undefined
}

/** Fila compacta etiqueta/valor; omite filas sin valor. */
export function DataRow({ label, value }: DataRowProps) {
  if (value == null || value === '') {
    return null
  }

  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="shrink-0 text-geo-mist/70">{label}</dt>
      <dd className="text-right font-medium text-geo-fog">{value}</dd>
    </div>
  )
}
