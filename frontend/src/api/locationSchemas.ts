import { z } from 'zod'

const nullableString = z.string().nullable().optional()
const nullableNumber = z.number().nullable().optional()

const departmentSchema = z.object({
  code: z.string(),
  name: z.string(),
})

const municipalitySchema = z.object({
  code: z.string(),
  name: z.string(),
  type: nullableString,
  area_km2: nullableNumber,
})

const alertLevelSchema = z.enum(['yellow', 'orange', 'red', 'unknown'])

const hydrologicalAlertSchema = z.object({
  id: z.number().nullable().optional(),
  type: z.literal('hydrological').optional(),
  level: alertLevelSchema,
  level_code: nullableNumber,
  level_label: nullableString,
  department: nullableString,
  hydrographic_area_code: nullableNumber,
  hydrographic_area: nullableString,
  hydrographic_zone_code: nullableNumber,
  hydrographic_zone: nullableString,
  hydrographic_subzone_code: nullableNumber,
  hydrographic_subzone: nullableString,
})

const landslideAlertSchema = z.object({
  id: z.number().nullable().optional(),
  type: z.literal('landslide').optional(),
  level: alertLevelSchema,
  level_code: nullableNumber,
  level_label: nullableString,
  department: nullableString,
  municipality: nullableString,
  municipality_code: nullableString,
  region: nullableString,
})

const fireAlertSchema = z.object({
  id: z.number().nullable().optional(),
  type: z.literal('fire').optional(),
  level: alertLevelSchema,
  level_code: nullableNumber,
  level_label: nullableString,
  department: nullableString,
  municipality: nullableString,
  municipality_code: nullableString,
  region: nullableString,
})

const alertsBucketSchema = z.object({
  has_alerts: z.boolean(),
  count: z.number(),
  alerts: z.array(z.unknown()),
})

export const locationContextResponseSchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  territory: z
    .object({
      department: departmentSchema.nullable().optional(),
      municipality: municipalitySchema.nullable().optional(),
      reference_year: nullableNumber,
    })
    .nullable()
    .optional(),
  weather: z
    .object({
      source: z.string(),
      timezone: z.string(),
      current: z.object({
        observed_at: nullableString,
        temperature_c: nullableNumber,
        feels_like_c: nullableNumber,
        condition: nullableString,
        humidity_percent: nullableNumber,
        precipitation_mm: nullableNumber,
        is_raining: z.boolean(),
        wind_speed_kmh: nullableNumber,
      }),
      today: z
        .object({
          temperature_min_c: nullableNumber,
          temperature_max_c: nullableNumber,
          precipitation_probability_max_percent: nullableNumber,
          precipitation_sum_mm: nullableNumber,
          uv_index_max: nullableNumber,
        })
        .nullable()
        .optional(),
      next_hours: z.array(
        z.object({
          time: z.string(),
          temperature_c: nullableNumber,
          condition: nullableString,
          precipitation_probability_percent: nullableNumber,
          rain_mm: nullableNumber,
        }),
      ),
    })
    .nullable()
    .optional(),
  alerts: z
    .object({
      source: z.string(),
      hydrological: alertsBucketSchema
        .extend({
          alerts: z.array(hydrologicalAlertSchema),
        })
        .nullable()
        .optional(),
      landslides: alertsBucketSchema
        .extend({
          alerts: z.array(landslideAlertSchema),
        })
        .nullable()
        .optional(),
      fires: alertsBucketSchema
        .extend({
          alerts: z.array(fireAlertSchema),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  mining: z
    .object({
      has_titles: z.boolean(),
      count: z.number(),
      titles: z.array(
        z.object({
          code: z.string(),
          area_ha: nullableNumber,
          registration_date: nullableString,
          status: nullableString,
          modality: nullableString,
          stage: nullableString,
          minerals: nullableString,
          departments: nullableString,
          municipalities: nullableString,
        }),
      ),
    })
    .nullable()
    .optional(),
  seismic: z
    .object({
      radius_km: z.number(),
      count: z.number(),
      returned: z.number(),
      earthquakes: z.array(
        z.object({
          id: z.number(),
          magnitude: z.number().nullable(),
          depth_km: z.number().nullable(),
          occurred_at: z.string().nullable(),
          latitude: z.number().nullable(),
          longitude: z.number().nullable(),
          municipality_code: nullableString,
          department_code: nullableString,
          distance_km: nullableNumber,
        }),
      ),
      recent: z.object({
        count: z.number(),
        returned: z.number(),
        earthquakes: z.array(
          z.object({
            id: z.string(),
            magnitude: nullableNumber,
            depth_km: nullableNumber,
            occurred_at: nullableString,
            latitude: nullableNumber,
            longitude: nullableNumber,
            location: nullableString,
            max_intensity: nullableNumber,
            distance_km: nullableNumber,
          }),
        ),
      }),
    })
    .nullable()
    .optional(),
  unavailable_sources: z
    .array(
      z.object({
        service: z.string(),
        component: z.string(),
        message: z.string(),
      }),
    )
    .default([]),
})
