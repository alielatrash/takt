import { prisma } from './prisma'
import type { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  entityId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityId: params.entityId,
      },
    })
    console.log(`[NOTIFICATION] Created notification ${notification.id} for user ${params.userId}`)
    return notification
  } catch (error) {
    console.error('[NOTIFICATION] Failed to create notification:', error)
    // Don't throw - notifications are non-critical
  }
}

// Notify supply planners when a demand forecast is created
export async function notifySupplyPlannersOfDemand(
  forecastId: string,
  clientName: string,
  citym: string,
  creatorName: string
) {
  try {
    console.log(`[NOTIFICATION] Starting notification process for forecast ${forecastId}`)

    // Get all supply planners
    const supplyPlanners = await prisma.user.findMany({
      where: {
        role: 'SUPPLY_PLANNER',
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    console.log(`[NOTIFICATION] Found ${supplyPlanners.length} supply planners:`, supplyPlanners.map(p => `${p.firstName} ${p.lastName} (${p.email})`))

    // Create notification for each supply planner
    const notifications = supplyPlanners.map((planner) =>
      createNotification({
        userId: planner.id,
        type: 'DEMAND_CREATED',
        title: 'New Demand Forecast',
        message: `${creatorName} created a forecast for ${clientName} on route ${citym}`,
        entityId: forecastId,
      })
    )

    await Promise.all(notifications)
    console.log(`[NOTIFICATION] Successfully sent ${notifications.length} notifications`)
  } catch (error) {
    console.error('[NOTIFICATION] Failed to notify supply planners:', error)
  }
}

// Notify demand planner when their forecast has supply commitments added/updated
export async function notifyDemandPlannerOfSupply(
  commitmentId: string,
  citym: string,
  supplierName: string,
  supplyPlannerName: string,
  planningWeekId: string
) {
  try {
    // Find demand forecasts for this route and week
    const forecasts = await prisma.demandForecast.findMany({
      where: {
        planningWeekId,
        routeKey: citym,
      },
      select: {
        createdById: true,
      },
      distinct: ['createdById'],
    })

    // Get unique demand planner IDs
    const demandPlannerIds = [...new Set(forecasts.map((f) => f.createdById))]

    // Create notification for each demand planner
    const notifications = demandPlannerIds.map((plannerId) =>
      createNotification({
        userId: plannerId,
        type: 'SUPPLY_UPDATED',
        title: 'Supply Plan Updated',
        message: `${supplyPlannerName} added/updated supply commitment from ${supplierName} for route ${citym}`,
        entityId: commitmentId,
      })
    )

    await Promise.all(notifications)
  } catch (error) {
    console.error('Failed to notify demand planners:', error)
  }
}
