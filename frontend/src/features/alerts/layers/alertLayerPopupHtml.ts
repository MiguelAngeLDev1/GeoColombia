import type { AlertLayerProperties, AlertLayerType } from '../../../api/alertLayerSchemas'
import { ALERT_LAYER_LABELS } from '../../../utils/alertLayerStyles'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function row(label: string, value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  return `<div class="geo-alert-popup__row"><span class="geo-alert-popup__label">${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`
}

function territorialCode(properties: AlertLayerProperties): string | null {
  if (properties.layer_type === 'hydrological') {
    const subzone = properties.hydrographic_subzone_code
    return subzone != null ? String(subzone) : null
  }

  return properties.municipality_code ?? properties.department_code ?? null
}

function contextualNote(layerType: AlertLayerType): string {
  if (layerType === 'hydrological') {
    return 'Unidad: subzona hidrográfica IDEAM.'
  }

  return 'Pronóstico municipal de amenaza IDEAM; no es un incidente confirmado.'
}

/** HTML del popup Leaflet para una feature normalizada. */
export function buildAlertLayerPopupHtml(
  properties: AlertLayerProperties,
): string {
  const layerType = properties.layer_type
  const title = properties.name?.trim() || 'Zona sin nombre'
  const levelText =
    properties.level_label?.trim() ||
    `Nivel ${properties.level}`
  const code = territorialCode(properties)

  return `
    <div class="geo-alert-popup">
      <strong class="geo-alert-popup__title">${escapeHtml(title)}</strong>
      ${row('Tipo', ALERT_LAYER_LABELS[layerType])}
      ${row('Nivel', levelText)}
      ${row('Fuente', properties.source || 'IDEAM')}
      ${row('Código territorial', code)}
      <p class="geo-alert-popup__note">${escapeHtml(contextualNote(layerType))}</p>
    </div>
  `.trim()
}
