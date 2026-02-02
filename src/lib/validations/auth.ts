import { z } from 'zod'

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  mobileNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{7,14}$/.test(val),
      'Invalid mobile number format'
    ),
  role: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER'], {
    message: 'Please select a valid role',
  }).optional(),
  organizationName: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters')
    .optional(),
  planningCycle: z
    .enum(['DAILY', 'WEEKLY', 'MONTHLY'], {
      message: 'Please select a valid planning cycle',
    })
    .optional(),
  weekStartDay: z
    .enum(['SUNDAY', 'MONDAY', 'SATURDAY'], {
      message: 'Please select a valid week start day',
    })
    .optional(),
})

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
})

export const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
  purpose: z.enum(['EMAIL_VERIFICATION', 'LOGIN']),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>
