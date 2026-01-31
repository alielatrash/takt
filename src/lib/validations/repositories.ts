import { z } from 'zod'

// Client validations
export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().max(20, 'Code must be less than 20 characters').optional(),
})

export const updateClientSchema = createClientSchema.partial()

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>

// Supplier validations
export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().max(20, 'Code must be less than 20 characters').optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>

// City validations
export const createCitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  nameAr: z.string().max(100).optional(),
  code: z.string().max(10, 'Code must be less than 10 characters').optional(),
  region: z.string().max(50).optional(),
})

export const updateCitySchema = createCitySchema.partial()

export type CreateCityInput = z.infer<typeof createCitySchema>
export type UpdateCityInput = z.infer<typeof updateCitySchema>

// Truck Type validations
export const createTruckTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
})

export const updateTruckTypeSchema = createTruckTypeSchema.partial()

export type CreateTruckTypeInput = z.infer<typeof createTruckTypeSchema>
export type UpdateTruckTypeInput = z.infer<typeof updateTruckTypeSchema>

// Search params
export const searchParamsSchema = z.object({
  q: z.string().optional().nullable().transform(v => v || undefined),
  page: z.string().optional().nullable().transform(v => {
    const num = parseInt(v || '1', 10)
    return isNaN(num) || num < 1 ? 1 : num
  }),
  pageSize: z.string().optional().nullable().transform(v => {
    const num = parseInt(v || '20', 10)
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 10000)
  }),
  sortBy: z.string().optional().nullable().transform(v => v || 'name'),
  sortOrder: z.string().optional().nullable().transform(v => {
    if (v === 'desc') return 'desc' as const
    return 'asc' as const
  }),
  isActive: z.string().optional().nullable().transform(v => {
    if (v === 'true') return true
    if (v === 'false') return false
    return undefined
  }),
})

export type SearchParams = z.infer<typeof searchParamsSchema>
