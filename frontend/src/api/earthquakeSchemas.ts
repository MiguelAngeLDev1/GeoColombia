import { z } from 'zod'

const nullableString = z.string().nullable().optional()
const nullableNumber = z.number().nullable().optional()

export const recentEarthquakeSchema = z.object({
  id: z.string(),
  magnitude: nullableNumber,
  depth_km: nullableNumber,
  occurred_at: nullableString,
  latitude: nullableNumber,
  longitude: nullableNumber,
  location: nullableString,
  max_intensity: nullableNumber,
  distance_km: nullableNumber,
})

export const recentEarthquakeListResponseSchema = z.object({
  source: z.string(),
  count: z.number().int(),
  data: z.array(recentEarthquakeSchema),
})

export const feltLocationSchema = z.object({
  municipality: nullableString,
  population_center: nullableString,
  municipality_code: nullableNumber,
  population_center_code: nullableNumber,
  distance_km: nullableNumber,
  intensity: nullableNumber,
  reports: z.number().int().default(0),
  latitude: nullableNumber,
  longitude: nullableNumber,
})

export const earthquakeDetailSchema = z.object({
  id: z.string(),
  magnitude: nullableNumber,
  depth_km: nullableNumber,
  occurred_at: nullableString,
  latitude: nullableNumber,
  longitude: nullableNumber,
  location: nullableString,
  territory: z
    .object({
      department: z
        .object({ code: z.string(), name: z.string() })
        .nullable()
        .optional(),
      municipality: z
        .object({
          code: z.string(),
          name: z.string(),
          type: nullableString,
          area_km2: nullableNumber,
        })
        .nullable()
        .optional(),
      reference_year: nullableNumber,
    })
    .nullable()
    .optional(),
  reports: z.object({
    count: z.number().int().default(0),
    population_centers: z.number().int().default(0),
  }),
  felt_locations: z.array(feltLocationSchema),
})

export const earthquakeDetailResponseSchema = z.object({
  source: z.string(),
  data: earthquakeDetailSchema,
})

export type RecentEarthquakeEvent = z.infer<typeof recentEarthquakeSchema>
export type RecentEarthquakeListResponse = z.infer<
  typeof recentEarthquakeListResponseSchema
>
export type FeltLocation = z.infer<typeof feltLocationSchema>
export type EarthquakeDetail = z.infer<typeof earthquakeDetailSchema>
export type EarthquakeDetailResponse = z.infer<
  typeof earthquakeDetailResponseSchema
>
