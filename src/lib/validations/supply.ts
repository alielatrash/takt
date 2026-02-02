import { z } from 'zod'

export const createSupplyCommitmentSchema = z.object({
  planningWeekId: z.string().min(1, 'Planning week is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  routeKey: z.string().min(1, 'Route is required'),
  truckTypeId: z.string().optional(),
  // Daily commitments (for weekly planning)
  day1Committed: z.number().min(0).optional(),
  day2Committed: z.number().min(0).optional(),
  day3Committed: z.number().min(0).optional(),
  day4Committed: z.number().min(0).optional(),
  day5Committed: z.number().min(0).optional(),
  day6Committed: z.number().min(0).optional(),
  day7Committed: z.number().min(0).optional(),
  // Weekly commitments (for monthly planning)
  week1Committed: z.number().min(0).optional(),
  week2Committed: z.number().min(0).optional(),
  week3Committed: z.number().min(0).optional(),
  week4Committed: z.number().min(0).optional(),
  week5Committed: z.number().min(0).optional(),
})

export const updateSupplyCommitmentSchema = z.object({
  day1Committed: z.number().min(0).optional(),
  day2Committed: z.number().min(0).optional(),
  day3Committed: z.number().min(0).optional(),
  day4Committed: z.number().min(0).optional(),
  day5Committed: z.number().min(0).optional(),
  day6Committed: z.number().min(0).optional(),
  day7Committed: z.number().min(0).optional(),
  week1Committed: z.number().min(0).optional(),
  week2Committed: z.number().min(0).optional(),
  week3Committed: z.number().min(0).optional(),
  week4Committed: z.number().min(0).optional(),
  week5Committed: z.number().min(0).optional(),
})

export type CreateSupplyCommitmentInput = z.infer<typeof createSupplyCommitmentSchema>
export type UpdateSupplyCommitmentInput = z.infer<typeof updateSupplyCommitmentSchema>
