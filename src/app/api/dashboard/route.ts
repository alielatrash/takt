import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getOrCreatePlanningWeek } from '@/lib/planning-week'
import { orgScopedWhere } from '@/lib/org-scoped'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Get current planning week (with org scoping)
    const currentWeek = await getOrCreatePlanningWeek(new Date(), session.user.currentOrgId)

    // Get demand forecasts for current week (with org scoping)
    const forecasts = await prisma.demandForecast.findMany({
      where: orgScopedWhere(session, { planningWeekId: currentWeek.id }),
      include: { party: true },
      orderBy: { createdAt: 'desc' },
    })

    // Get supply commitments for current week (with org scoping)
    const commitments = await prisma.supplyCommitment.findMany({
      where: orgScopedWhere(session, { planningWeekId: currentWeek.id }),
    })

    // Calculate total demand
    const totalDemand = forecasts.reduce((sum, f) => {
      return sum + f.day1Qty + f.day2Qty + f.day3Qty +
        f.day4Qty + f.day5Qty + f.day6Qty + f.day7Qty
    }, 0)

    // Calculate total committed supply
    const totalCommitted = commitments.reduce((sum, c) => {
      return sum + c.day1Committed + c.day2Committed + c.day3Committed +
        c.day4Committed + c.day5Committed + c.day6Committed + c.day7Committed
    }, 0)

    // Calculate supply gap
    const supplyGap = totalDemand - totalCommitted
    const gapPercent = totalDemand > 0 ? Math.round((supplyGap / totalDemand) * 100) : 0

    // Get unique active routes (routeKey)
    const activeRoutes = new Set(forecasts.map(f => f.routeKey)).size

    // Calculate gap by route
    const demandByRouteKey = new Map<string, number>()
    for (const forecast of forecasts) {
      const total = forecast.day1Qty + forecast.day2Qty + forecast.day3Qty +
        forecast.day4Qty + forecast.day5Qty + forecast.day6Qty + forecast.day7Qty
      demandByRouteKey.set(forecast.routeKey, (demandByRouteKey.get(forecast.routeKey) || 0) + total)
    }

    const committedByRouteKey = new Map<string, number>()
    for (const commitment of commitments) {
      const total = commitment.day1Committed + commitment.day2Committed + commitment.day3Committed +
        commitment.day4Committed + commitment.day5Committed + commitment.day6Committed + commitment.day7Committed
      committedByRouteKey.set(commitment.routeKey, (committedByRouteKey.get(commitment.routeKey) || 0) + total)
    }

    // Get routes with highest gaps
    const routeGaps = Array.from(demandByRouteKey.entries()).map(([routeKey, target]) => ({
      routeKey,
      target,
      committed: committedByRouteKey.get(routeKey) || 0,
      gap: target - (committedByRouteKey.get(routeKey) || 0),
    }))
    routeGaps.sort((a, b) => b.gap - a.gap)
    const topGapRoutes = routeGaps.slice(0, 5)

    // Get recent forecasts
    const recentForecasts = forecasts.slice(0, 5).map(f => ({
      id: f.id,
      routeKey: f.routeKey,
      partyName: f.party?.name || null,
      totalQty: f.day1Qty + f.day2Qty + f.day3Qty +
        f.day4Qty + f.day5Qty + f.day6Qty + f.day7Qty,
      createdAt: f.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        currentWeek: {
          id: currentWeek.id,
          weekNumber: currentWeek.weekNumber,
          year: currentWeek.year,
          weekStart: currentWeek.weekStart.toISOString(),
          weekEnd: currentWeek.weekEnd.toISOString(),
        },
        metrics: {
          totalDemand,
          totalCommitted,
          supplyGap,
          activeRoutes,
          gapPercent,
        },
        topGapRoutes,
        recentForecasts,
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard' } },
      { status: 500 }
    )
  }
}
