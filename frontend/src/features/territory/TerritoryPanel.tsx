import { DataRow } from '../../components/DataRow'
import { SectionCard } from '../../components/SectionCard'
import {
  resolveTerritorySection,
  unavailableMessageFor,
} from '../../services/contextSections'
import type {
  TerritoryContext,
  UnavailableSource,
} from '../../types/location'
import { formatAreaKm2 } from '../../utils/formatUnits'

interface TerritoryPanelProps {
  territory: TerritoryContext | null | undefined
  unavailableSources: UnavailableSource[]
}

export function TerritoryPanel({
  territory,
  unavailableSources,
}: TerritoryPanelProps) {
  const state = resolveTerritorySection(territory, unavailableSources)

  return (
    <SectionCard
      title="Territorio"
      subtitle="Marco Geoestadístico DANE"
      state={state}
      emptyMessage="Sin municipio o departamento identificado para este punto."
      unavailableMessage={unavailableMessageFor(
        unavailableSources,
        'territory',
      )}
    >
      <dl className="space-y-2">
        <DataRow label="Municipio" value={territory?.municipality?.name} />
        <DataRow label="Departamento" value={territory?.department?.name} />
        <DataRow
          label="Código DANE"
          value={territory?.municipality?.code}
        />
        <DataRow label="Tipo" value={territory?.municipality?.type} />
        <DataRow
          label="Área"
          value={formatAreaKm2(territory?.municipality?.area_km2)}
        />
        <DataRow
          label="Año de referencia"
          value={
            territory?.reference_year != null
              ? String(territory.reference_year)
              : null
          }
        />
      </dl>
    </SectionCard>
  )
}
