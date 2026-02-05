import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { orgScopedWhere } from '@/lib/org-scoped'

// Get aggregated demand targets by routeKey (for supply planning view)
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const planningWeekId = searchParams.get('planningWeekId')

    if (!planningWeekId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Planning week ID is required' } },
        { status: 400 }
      )
    }

    // Get filter parameters
    const plannerIds = searchParams.getAll('plannerIds')
    const clientIds = searchParams.getAll('clientIds')
    const categoryIds = searchParams.getAll('categoryIds')
    const truckTypeIds = searchParams.getAll('truckTypeIds')

    // Build where clause with filters
    const demandWhereClause = orgScopedWhere(session, {
      planningWeekId,
      ...(plannerIds.length > 0 && { createdById: { in: plannerIds } }),
      ...(clientIds.length > 0 && { partyId: { in: clientIds } }),
      ...(categoryIds.length > 0 && { demandCategoryId: { in: categoryIds } }),
      ...(truckTypeIds.length > 0 && {
        resourceTypes: {
          some: {
            resourceTypeId: { in: truckTypeIds }
          }
        }
      }),
    })

    // Run queries in parallel for better performance (with org scoping)
    const [aggregatedDemand, commitments, demandForecasts, forecastResourceTypes] = await Promise.all([
      // Aggregate demand forecasts by routeKey
      prisma.demandForecast.groupBy({
        by: ['routeKey'],
        where: demandWhereClause,
        _sum: {
          day1Qty: true,
          day2Qty: true,
          day3Qty: true,
          day4Qty: true,
          day5Qty: true,
          day6Qty: true,
          day7Qty: true,
          totalQty: true,
        },
        _count: { id: true },
      }),
      // Get all supply commitments for this week (not filtered - show all commitments)
      prisma.supplyCommitment.findMany({
        where: orgScopedWhere(session, { planningWeekId }),
        include: {
          party: { select: { id: true, name: true } },
        },
      }),
      // Get individual demand forecasts with party details for breakdown
      prisma.demandForecast.findMany({
        where: demandWhereClause,
        select: {
          id: true,
          routeKey: true,
          party: { select: { id: true, name: true } },
          day1Qty: true,
          day2Qty: true,
          day3Qty: true,
          day4Qty: true,
          day5Qty: true,
          day6Qty: true,
          day7Qty: true,
          totalQty: true,
        },
        orderBy: [
          { party: { name: 'asc' } },
        ],
      }),
      // Get truck types through junction table
      prisma.demandForecastResourceType.findMany({
        where: {
          demandForecast: demandWhereClause,
        },
        select: {
          demandForecastId: true,
          resourceType: { select: { id: true, name: true } },
        },
      }),
    ])

    // Group commitments by routeKey
    const commitmentsByRouteKey = commitments.reduce((acc, commitment) => {
      if (!acc[commitment.routeKey]) {
        acc[commitment.routeKey] = []
      }
      acc[commitment.routeKey].push(commitment)
      return acc
    }, {} as Record<string, typeof commitments>)

    // Group demand forecasts by routeKey for party breakdown
    const forecastsByRouteKey = demandForecasts.reduce((acc, forecast) => {
      if (!acc[forecast.routeKey]) {
        acc[forecast.routeKey] = []
      }
      acc[forecast.routeKey].push(forecast)
      return acc
    }, {} as Record<string, typeof demandForecasts>)

    // Group resource types by forecast ID
    const resourceTypesByForecast = forecastResourceTypes.reduce((acc, frt) => {
      if (!acc[frt.demandForecastId]) {
        acc[frt.demandForecastId] = []
      }
      acc[frt.demandForecastId].push(frt.resourceType)
      return acc
    }, {} as Record<string, Array<{ id: string; name: string }>>)

    // Aggregate unique truck types by routeKey
    const truckTypesByRouteKey = demandForecasts.reduce((acc, forecast) => {
      const truckTypes = resourceTypesByForecast[forecast.id] || []
      if (!acc[forecast.routeKey]) {
        acc[forecast.routeKey] = new Map<string, { id: string; name: string }>()
      }
      truckTypes.forEach((tt) => {
        acc[forecast.routeKey].set(tt.id, tt)
      })
      return acc
    }, {} as Record<string, Map<string, { id: string; name: string }>>)

    // Build targets with gap calculation
    const targets = aggregatedDemand.map((demand) => {
      const routeCommitments = commitmentsByRouteKey[demand.routeKey] || []

      // Sum up all commitments for this routeKey
      const totalCommitments = routeCommitments.reduce(
        (sums, c) => ({
          day1: sums.day1 + c.day1Committed,
          day2: sums.day2 + c.day2Committed,
          day3: sums.day3 + c.day3Committed,
          day4: sums.day4 + c.day4Committed,
          day5: sums.day5 + c.day5Committed,
          day6: sums.day6 + c.day6Committed,
          day7: sums.day7 + c.day7Committed,
          total: sums.total + c.totalCommitted,
        }),
        { day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0, total: 0 }
      )

      const target = {
        day1: demand._sum.day1Qty ?? 0,
        day2: demand._sum.day2Qty ?? 0,
        day3: demand._sum.day3Qty ?? 0,
        day4: demand._sum.day4Qty ?? 0,
        day5: demand._sum.day5Qty ?? 0,
        day6: demand._sum.day6Qty ?? 0,
        day7: demand._sum.day7Qty ?? 0,
        total: demand._sum.totalQty ?? 0,
      }

      const gap = {
        day1: target.day1 - totalCommitments.day1,
        day2: target.day2 - totalCommitments.day2,
        day3: target.day3 - totalCommitments.day3,
        day4: target.day4 - totalCommitments.day4,
        day5: target.day5 - totalCommitments.day5,
        day6: target.day6 - totalCommitments.day6,
        day7: target.day7 - totalCommitments.day7,
        total: target.total - totalCommitments.total,
      }

      // Calculate capacity percentage (committed / target * 100)
      // If > 100%, capacity is over-filled (positive)
      // If < 100%, capacity is under-filled (negative)
      const capacityPercent = target.total > 0
        ? Math.round((totalCommitments.total / target.total) * 100)
        : 0

      // Keep gapPercent for backward compatibility but calculate it properly
      const gapPercent = target.total > 0
        ? Math.round((gap.total / target.total) * 100)
        : 0

      // Get party breakdown for this routeKey (map to 'clients' for frontend)
      const routeForecasts = forecastsByRouteKey[demand.routeKey] || []
      const clientBreakdown = routeForecasts.map((f) => ({
        client: f.party,
        day1: f.day1Qty,
        day2: f.day2Qty,
        day3: f.day3Qty,
        day4: f.day4Qty,
        day5: f.day5Qty,
        day6: f.day6Qty,
        day7: f.day7Qty,
        total: f.totalQty,
      }))

      // Get unique truck types for this route
      const routeTruckTypes = truckTypesByRouteKey[demand.routeKey]
        ? Array.from(truckTypesByRouteKey[demand.routeKey].values())
        : []

      return {
        routeKey: demand.routeKey,
        forecastCount: demand._count.id,
        target,
        committed: totalCommitments,
        gap,
        gapPercent,
        capacityPercent,
        truckTypes: routeTruckTypes,
        clients: clientBreakdown,
        commitments: routeCommitments.map((c) => ({
          id: c.id,
          party: c.party,
          day1Committed: c.day1Committed,
          day2Committed: c.day2Committed,
          day3Committed: c.day3Committed,
          day4Committed: c.day4Committed,
          day5Committed: c.day5Committed,
          day6Committed: c.day6Committed,
          day7Committed: c.day7Committed,
          totalCommitted: c.totalCommitted,
        })),
      }
    })

    // Sort by volume (highest target volume first)
    targets.sort((a, b) => b.target.total - a.target.total)

    return NextResponse.json({
      success: true,
      data: targets,
    })
  } catch (error) {
    console.error('Get supply targets error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
