import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { orgScopedWhere } from '@/lib/org-scoped'

// Forecast Accuracy Report
// Compares forecasted demand vs actual client requests (from Redash ActualShipperRequest data)
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get forecasts (with org scoping)
    const forecastWhere = planningWeekId ? { planningWeekId } : {}
    const forecasts = await prisma.demandForecast.groupBy({
      by: ['routeKey'],
      where: orgScopedWhere(session, forecastWhere),
      _sum: {
        totalQty: true,
      },
    })

    // Get actual requests
    // Note: ActualShipperRequest doesn't have organizationId
    const actualWhere: Record<string, unknown> = {}
    if (startDate) actualWhere.requestDate = { gte: new Date(startDate) }
    if (endDate) actualWhere.requestDate = { ...actualWhere.requestDate as object, lte: new Date(endDate) }

    const actuals = await prisma.actualShipperRequest.groupBy({
      by: ['citym'],
      where: actualWhere,
      _sum: {
        loadsRequested: true,
        loadsFulfilled: true,
      },
    })

    // Build comparison data (routeKey from forecasts, citym from actuals - they should match)
    const forecastMap = new Map(forecasts.map(f => [f.routeKey, f._sum.totalQty ?? 0]))
    const actualMap = new Map(actuals.map(a => [a.citym, {
      requested: a._sum.loadsRequested ?? 0,
      fulfilled: a._sum.loadsFulfilled ?? 0,
    }]))

    const allRouteKeys = new Set([...forecastMap.keys(), ...actualMap.keys()])

    const report = Array.from(allRouteKeys).map(routeKey => {
      const forecasted = forecastMap.get(routeKey) ?? 0
      const actual = actualMap.get(routeKey) ?? { requested: 0, fulfilled: 0 }

      const variance = actual.requested - forecasted
      const accuracyPercent = forecasted > 0
        ? Math.round((1 - Math.abs(variance) / forecasted) * 100)
        : actual.requested === 0 ? 100 : 0

      return {
        routeKey,
        forecasted,
        actualRequested: actual.requested,
        actualFulfilled: actual.fulfilled,
        variance,
        accuracyPercent: Math.max(0, accuracyPercent),
        fulfillmentRate: actual.requested > 0
          ? Math.round((actual.fulfilled / actual.requested) * 100)
          : 0,
      }
    })

    // Sort by variance (worst first)
    report.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))

    // Calculate summary
    const totalForecasted = report.reduce((sum, r) => sum + r.forecasted, 0)
    const totalActualRequested = report.reduce((sum, r) => sum + r.actualRequested, 0)
    const totalActualFulfilled = report.reduce((sum, r) => sum + r.actualFulfilled, 0)
    const overallAccuracy = totalForecasted > 0
      ? Math.round((1 - Math.abs(totalActualRequested - totalForecasted) / totalForecasted) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalForecasted,
          totalActualRequested,
          totalActualFulfilled,
          overallAccuracy: Math.max(0, overallAccuracy),
          overallFulfillmentRate: totalActualRequested > 0
            ? Math.round((totalActualFulfilled / totalActualRequested) * 100)
            : 0,
          routeCount: report.length,
        },
        routes: report,
      },
    })
  } catch (error) {
    console.error('Forecast accuracy report error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
