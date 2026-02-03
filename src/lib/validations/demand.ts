import { z } from 'zod'

export const createDemandForecastSchema = z.object({
  planningWeekId: z.string().min(1, 'Planning week is required'),
  clientId: z.string().min(1, 'Client is required'),
  pickupCityId: z.string().min(1, 'Pickup city is required'),
  dropoffCityId: z.string().min(1, 'Dropoff city is required'),
  demandCategoryId: z.string().optional(),
  truckTypeId: z.string().min(1, 'Truck type is required'),
  // Daily loads (for weekly planning)
  day1Loads: z.number().min(0).optional(),
  day2Loads: z.number().min(0).optional(),
  day3Loads: z.number().min(0).optional(),
  day4Loads: z.number().min(0).optional(),
  day5Loads: z.number().min(0).optional(),
  day6Loads: z.number().min(0).optional(),
  day7Loads: z.number().min(0).optional(),
  // Weekly loads (for monthly planning)
  week1Loads: z.number().min(0).optional(),
  week2Loads: z.number().min(0).optional(),
  week3Loads: z.number().min(0).optional(),
  week4Loads: z.number().min(0).optional(),
  week5Loads: z.number().min(0).optional(),
})

export const updateDemandForecastSchema = z.object({
  // Daily loads (for weekly planning)
  day1Loads: z.number().min(0).optional(),
  day2Loads: z.number().min(0).optional(),
  day3Loads: z.number().min(0).optional(),
  day4Loads: z.number().min(0).optional(),
  day5Loads: z.number().min(0).optional(),
  day6Loads: z.number().min(0).optional(),
  day7Loads: z.number().min(0).optional(),
  // Weekly loads (for monthly planning)
  week1Loads: z.number().min(0).optional(),
  week2Loads: z.number().min(0).optional(),
  week3Loads: z.number().min(0).optional(),
  week4Loads: z.number().min(0).optional(),
  week5Loads: z.number().min(0).optional(),
  demandCategoryId: z.string().optional(),
  truckTypeId: z.string().optional(),
})

export type CreateDemandForecastInput = z.infer<typeof createDemandForecastSchema>
export type UpdateDemandForecastInput = z.infer<typeof updateDemandForecastSchema>
