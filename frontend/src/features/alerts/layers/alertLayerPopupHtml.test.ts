import { describe, expect, it } from 'vitest'
import { buildAlertLayerPopupHtml } from './alertLayerPopupHtml'

describe('buildAlertLayerPopupHtml', () => {
  it('incluye nombre, nivel, fuente y nota de subzona hidrográfica', () => {
    const html = buildAlertLayerPopupHtml({
      object_id: 1,
      layer_type: 'hydrological',
      level: 2,
      level_key: 'orange',
      level_label: 'ALERTA NARANJA',
      name: 'Río Coello',
      source: 'IDEAM',
      hydrographic_subzone_code: 2121,
    })

    expect(html).toContain('Río Coello')
    expect(html).toContain('ALERTA NARANJA')
    expect(html).toContain('IDEAM')
    expect(html).toContain('2121')
    expect(html).toMatch(/subzona hidrográfica/i)
  })

  it('indica pronóstico municipal para deslizamientos e incendios', () => {
    const slides = buildAlertLayerPopupHtml({
      object_id: 2,
      layer_type: 'landslides',
      level: 1,
      level_key: 'yellow',
      level_label: 'AMENAZA BAJA',
      name: 'Ibagué',
      source: 'IDEAM',
      municipality_code: '73001',
    })
    expect(slides).toMatch(/Pronóstico municipal/i)
    expect(slides).toContain('73001')

    const fires = buildAlertLayerPopupHtml({
      object_id: 3,
      layer_type: 'fires',
      level: 3,
      level_key: 'red',
      level_label: 'AMENAZA ALTA',
      name: 'Chaparral',
      source: 'IDEAM',
    })
    expect(fires).toMatch(/no es un incidente confirmado/i)
  })

  it('escapa HTML en nombres', () => {
    const html = buildAlertLayerPopupHtml({
      object_id: 4,
      layer_type: 'fires',
      level: 1,
      level_key: 'yellow',
      level_label: 'AMENAZA BAJA',
      name: '<script>x</script>',
      source: 'IDEAM',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
