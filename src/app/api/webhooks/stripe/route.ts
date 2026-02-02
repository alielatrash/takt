import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { stripe, getTierFromPriceId } from '@/lib/stripe'

// Disable body parsing for webhooks
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_SIGNATURE', message: 'Missing Stripe signature' } },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid Stripe signature' } },
        { status: 400 }
      )
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`)

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, event.id)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.id)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, event.id)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.id)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, event.id)
        break

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Webhook processing failed' } },
      { status: 500 }
    )
  }
}

// Handle checkout.session.completed - New subscription created
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const { customer, subscription, metadata } = session

  if (!customer || !subscription || !metadata?.organizationId) {
    console.error('[Webhook] Missing required fields in checkout session')
    return
  }

  const customerId = typeof customer === 'string' ? customer : customer.id
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id
  const organizationId = metadata.organizationId
  const tier = metadata.tier as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  const billingCycle = metadata.billingCycle as 'MONTHLY' | 'ANNUAL'

  // Check for idempotency
  const existingEvent = await prisma.subscriptionEvent.findUnique({
    where: { stripeEventId: eventId },
  })

  if (existingEvent) {
    console.log('[Webhook] Event already processed (idempotency check)')
    return
  }

  // Fetch full subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = stripeSubscription.items.data[0]?.price.id

  // Update organization
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      subscriptionTier: tier,
      subscriptionStatus: 'ACTIVE',
      currentBillingCycle: billingCycle,
      subscriptionCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialEndsAt: null, // Clear trial date
    },
  })

  // Create subscription event
  await prisma.subscriptionEvent.create({
    data: {
      organizationId,
      eventType: 'TRIAL_CONVERTED',
      toTier: tier,
      toBillingCycle: billingCycle,
      stripeEventId: eventId,
      amount: session.amount_total || 0,
      metadata: {
        sessionId: session.id,
        customerId,
        subscriptionId,
      },
    },
  })

  console.log(`[Webhook] Subscription created for organization ${organizationId}`)
}

// Handle customer.subscription.updated - Plan changes, renewals, scheduled downgrades
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventId: string
) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  // Find organization by Stripe customer ID
  const organization = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!organization) {
    console.error('[Webhook] Organization not found for customer:', customerId)
    return
  }

  // Check for idempotency
  const existingEvent = await prisma.subscriptionEvent.findUnique({
    where: { stripeEventId: eventId },
  })

  if (existingEvent) {
    console.log('[Webhook] Event already processed (idempotency check)')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const tierInfo = getTierFromPriceId(priceId!)

  if (!tierInfo) {
    console.error('[Webhook] Could not determine tier from price ID:', priceId)
    return
  }

  const { tier, cycle } = tierInfo
  const previousTier = organization.subscriptionTier
  const previousCycle = organization.currentBillingCycle

  // Determine event type
  let eventType: 'UPGRADED' | 'DOWNGRADED' | 'RENEWED' = 'RENEWED'
  if (previousTier !== tier) {
    const tierOrder: Record<string, number> = { STARTER: 1, PROFESSIONAL: 2, ENTERPRISE: 3 }
    eventType = tierOrder[tier] > tierOrder[previousTier] ? 'UPGRADED' : 'DOWNGRADED'
  }

  // Update organization
  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionTier: tier,
      subscriptionStatus: subscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
      currentBillingCycle: cycle,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })

  // Create subscription event
  await prisma.subscriptionEvent.create({
    data: {
      organizationId: organization.id,
      eventType,
      fromTier: previousTier,
      toTier: tier,
      fromBillingCycle: previousCycle,
      toBillingCycle: cycle,
      stripeEventId: eventId,
      metadata: {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    },
  })

  console.log(`[Webhook] Subscription updated: ${eventType} for organization ${organization.id}`)
}

// Handle customer.subscription.deleted - Subscription cancelled
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventId: string
) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  // Find organization by Stripe customer ID
  const organization = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!organization) {
    console.error('[Webhook] Organization not found for customer:', customerId)
    return
  }

  // Check for idempotency
  const existingEvent = await prisma.subscriptionEvent.findUnique({
    where: { stripeEventId: eventId },
  })

  if (existingEvent) {
    console.log('[Webhook] Event already processed (idempotency check)')
    return
  }

  // Update organization
  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      subscriptionStatus: 'CANCELLED',
      subscriptionCancelAtPeriodEnd: false,
    },
  })

  // Create subscription event
  await prisma.subscriptionEvent.create({
    data: {
      organizationId: organization.id,
      eventType: 'CANCELLED',
      fromTier: organization.subscriptionTier,
      stripeEventId: eventId,
      metadata: {
        subscriptionId: subscription.id,
        canceledAt: subscription.canceled_at,
      },
    },
  })

  console.log(`[Webhook] Subscription cancelled for organization ${organization.id}`)
}

// Handle invoice.payment_succeeded - Successful payment/renewal
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  eventId: string
) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  if (!customerId) {
    console.error('[Webhook] Missing customer in invoice')
    return
  }

  // Find organization by Stripe customer ID
  const organization = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!organization) {
    console.error('[Webhook] Organization not found for customer:', customerId)
    return
  }

  // Check for idempotency
  const existingEvent = await prisma.subscriptionEvent.findUnique({
    where: { stripeEventId: eventId },
  })

  if (existingEvent) {
    console.log('[Webhook] Event already processed (idempotency check)')
    return
  }

  // If status was PAST_DUE, update to ACTIVE
  if (organization.subscriptionStatus === 'PAST_DUE') {
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionStatus: 'ACTIVE',
      },
    })
  }

  // Create subscription event
  await prisma.subscriptionEvent.create({
    data: {
      organizationId: organization.id,
      eventType: 'RENEWED',
      stripeEventId: eventId,
      amount: invoice.amount_paid,
      metadata: {
        invoiceId: invoice.id,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
      },
    },
  })

  console.log(`[Webhook] Payment succeeded for organization ${organization.id}`)
}

// Handle invoice.payment_failed - Failed payment
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  eventId: string
) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  if (!customerId) {
    console.error('[Webhook] Missing customer in invoice')
    return
  }

  // Find organization by Stripe customer ID
  const organization = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!organization) {
    console.error('[Webhook] Organization not found for customer:', customerId)
    return
  }

  // Check for idempotency
  const existingEvent = await prisma.subscriptionEvent.findUnique({
    where: { stripeEventId: eventId },
  })

  if (existingEvent) {
    console.log('[Webhook] Event already processed (idempotency check)')
    return
  }

  // Update organization status to PAST_DUE
  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      subscriptionStatus: 'PAST_DUE',
    },
  })

  // Create subscription event
  await prisma.subscriptionEvent.create({
    data: {
      organizationId: organization.id,
      eventType: 'PAYMENT_FAILED',
      stripeEventId: eventId,
      amount: invoice.amount_due,
      metadata: {
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      },
    },
  })

  console.log(`[Webhook] Payment failed for organization ${organization.id}`)

  // TODO: Send notification email to organization owner about failed payment
}
