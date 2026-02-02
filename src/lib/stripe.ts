import Stripe from 'stripe'

// Lazy initialization of Stripe client
let stripeClient: Stripe | null = null

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    stripeClient = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    })
  }
  return stripeClient
}

// Export getter instead of direct client
export const stripe = {
  get client() {
    return getStripeClient()
  },
  // Proxy common methods for convenience
  get customers() {
    return getStripeClient().customers
  },
  get subscriptions() {
    return getStripeClient().subscriptions
  },
  get checkout() {
    return getStripeClient().checkout
  },
  get billingPortal() {
    return getStripeClient().billingPortal
  },
  get webhooks() {
    return getStripeClient().webhooks
  },
}

// Subscription tiers
export type SubscriptionTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type BillingCycle = 'MONTHLY' | 'ANNUAL'

// Price mapping configuration
const PRICE_IDS: Record<string, string> = {
  STARTER_MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
  STARTER_ANNUAL: process.env.STRIPE_PRICE_STARTER_ANNUAL || '',
  PROFESSIONAL_MONTHLY: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
  PROFESSIONAL_ANNUAL: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || '',
  ENTERPRISE_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
  ENTERPRISE_ANNUAL: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || '',
}

/**
 * Get Stripe price ID from tier and billing cycle
 */
export function getStripePriceId(
  tier: SubscriptionTier,
  cycle: BillingCycle
): string {
  const key = `${tier}_${cycle}` as keyof typeof PRICE_IDS
  const priceId = PRICE_IDS[key]

  if (!priceId) {
    throw new Error(`No price ID configured for ${tier} ${cycle}`)
  }

  return priceId
}

/**
 * Get tier and cycle from Stripe price ID (reverse mapping)
 */
export function getTierFromPriceId(priceId: string): {
  tier: SubscriptionTier
  cycle: BillingCycle
} | null {
  for (const [key, value] of Object.entries(PRICE_IDS)) {
    if (value === priceId) {
      const [tier, cycle] = key.split('_') as [SubscriptionTier, BillingCycle]
      return { tier, cycle }
    }
  }
  return null
}

/**
 * Format amount in cents to currency string
 */
export function formatAmount(cents: number, currency: string = 'SAR'): string {
  const amount = cents / 100
  // Format number with commas for thousands
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  // Return in format "SAR 999" to avoid RTL issues
  return `${currency} ${formattedNumber}`
}

/**
 * Get pricing information for display
 */
export function getPricing() {
  return {
    STARTER: {
      monthly: { amount: 99900, formatted: formatAmount(99900) }, // SAR 999/month
      annual: { amount: 999000, formatted: formatAmount(999000) }, // SAR 9,990/year
    },
    PROFESSIONAL: {
      monthly: { amount: 199900, formatted: formatAmount(199900) }, // SAR 1,999/month
      annual: { amount: 1999000, formatted: formatAmount(1999000) }, // SAR 19,990/year
    },
    ENTERPRISE: {
      monthly: { amount: 0, formatted: 'Contact Sales' }, // Contact sales
      annual: { amount: 0, formatted: 'Contact Sales' }, // Contact sales
    },
  }
}

/**
 * Calculate annual savings percentage
 */
export function getAnnualSavings(tier: SubscriptionTier): number {
  const pricing = getPricing()[tier]
  const monthlyAnnual = pricing.monthly.amount * 12
  const savings = ((monthlyAnnual - pricing.annual.amount) / monthlyAnnual) * 100
  return Math.round(savings)
}

/**
 * Get feature list for each tier
 */
export function getTierFeatures(tier: SubscriptionTier): string[] {
  const features = {
    STARTER: [
      'Up to 5 team members',
      'Basic demand and supply planning',
      'Standard reports',
      'Email support',
      '30-day data retention',
    ],
    PROFESSIONAL: [
      'Up to 20 team members',
      'Advanced demand forecasting',
      'Supply optimization',
      'Custom reports & analytics',
      'Priority email & chat support',
      'Unlimited data retention',
      'CSV import/export',
      'API access',
    ],
    ENTERPRISE: [
      'Unlimited team members',
      'AI-powered forecasting',
      'Advanced supply chain optimization',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 phone & email support',
      'SLA guarantee',
      'Custom training',
      'White-label options',
    ],
  }

  return features[tier] || []
}

/**
 * Check if upgrade (returns true if toTier is higher than fromTier)
 */
export function isUpgrade(
  fromTier: SubscriptionTier,
  toTier: SubscriptionTier
): boolean {
  const tierOrder: Record<SubscriptionTier, number> = {
    STARTER: 1,
    PROFESSIONAL: 2,
    ENTERPRISE: 3,
  }
  return tierOrder[toTier] > tierOrder[fromTier]
}

/**
 * Check if tier change (different tier, ignoring billing cycle)
 */
export function isTierChange(
  fromTier: SubscriptionTier,
  toTier: SubscriptionTier
): boolean {
  return fromTier !== toTier
}
