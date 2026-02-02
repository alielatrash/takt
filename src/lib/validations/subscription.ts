import { z } from 'zod'

// Subscription tier validation
export const subscriptionTierSchema = z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'])

// Billing cycle validation
export const billingCycleSchema = z.enum(['MONTHLY', 'ANNUAL'])

// Create checkout session
export const checkoutSessionSchema = z.object({
  tier: subscriptionTierSchema,
  billingCycle: billingCycleSchema,
})

// Update subscription
export const updateSubscriptionSchema = z.object({
  tier: subscriptionTierSchema,
  billingCycle: billingCycleSchema,
})

// Type exports
export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>
