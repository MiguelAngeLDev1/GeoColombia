import type { SectionUiState, UnavailableSource } from '../types/location'

/**
 * Traduce la semántica del backend (null vs vacío vs unavailable)
 * a estados de UI por sección. Sin lógica de presentación.
 */
export function resolveSectionState(options: {
  isLoading: boolean
  hasError: boolean
  sectionPresent: boolean
  isEmptyOk: boolean
  unavailableSources: UnavailableSource[]
  component: string
}): SectionUiState {
  if (options.isLoading) {
    return 'loading'
  }

  if (options.hasError) {
    return 'error'
  }

  const sourceUnavailable = options.unavailableSources.some(
    (item) => item.component === options.component,
  )

  if (!options.sectionPresent || sourceUnavailable) {
    return 'source_unavailable'
  }

  if (options.isEmptyOk) {
    return 'empty_ok'
  }

  return 'available'
}
