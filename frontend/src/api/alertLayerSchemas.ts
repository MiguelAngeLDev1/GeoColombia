import { z } from 'zod'

export const alertLayerTypeSchema = z.enum([
  'hydrological',
  'landslides',
  'fires',
])

export type AlertLayerType = z.infer<typeof alertLayerTypeSchema>

const nullableString = z.string().nullable().optional()
const nullableNumber = z.number().nullable().optional()

/** Posición GeoJSON: [lon, lat] (+ altitud opcional). */
const positionSchema = z.array(z.number()).min(2)

const polygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(positionSchema)),
})

const multiPolygonGeometrySchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(positionSchema))),
})

export const alertLayerGeometrySchema = z.discriminatedUnion('type', [
  polygonGeometrySchema,
  multiPolygonGeometrySchema,
])

const alertLayerPropertiesSchema = z
  .object({
    object_id: z.number().int(),
    layer_type: alertLayerTypeSchema,
    level: z.number().int(),
    level_key: z.string(),
    level_label: z.string(),
    name: nullableString,
    source: z.literal('IDEAM'),
    department: nullableString,
    hydrographic_area_code: nullableNumber,
    hydrographic_area: nullableString,
    hydrographic_zone_code: nullableNumber,
    hydrographic_zone: nullableString,
    hydrographic_subzone_code: nullableNumber,
    hydrographic_subzone: nullableString,
    municipality: nullableString,
    municipality_code: nullableString,
    department_code: nullableString,
    region: nullableString,
  })
  .passthrough()

export const alertLayerFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: alertLayerGeometrySchema,
  properties: alertLayerPropertiesSchema,
})

export const alertLayerCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(alertLayerFeatureSchema),
  source: z.literal('IDEAM').optional(),
  layer_type: alertLayerTypeSchema.optional(),
  bbox: z.array(z.number()).length(4).optional(),
  min_level: z.number().int().optional(),
  count: z.number().int().optional(),
  cached: z.boolean().optional(),
})

export type AlertLayerFeature = z.infer<typeof alertLayerFeatureSchema>
export type AlertLayerCollection = z.infer<typeof alertLayerCollectionSchema>
export type AlertLayerProperties = z.infer<typeof alertLayerPropertiesSchema>
