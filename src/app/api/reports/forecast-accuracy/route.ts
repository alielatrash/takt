import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'
import { orgScopedWhere } from '@/lib/org-scoped'

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
    const weeksBack = parseInt(searchParams.get('weeks') || '4', 10)

    // Get date range
    const now = new Date()
    const endDate = endOfWeek(now, { weekStartsOn: 0 })
    const startDate = startOfWeek(subWeeks(now, weeksBack), { weekStartsOn: 0 })

    // Get forecasts grouped by week and routeKey (with org scoping)
    const forecasts = await prisma.demandForecast.groupBy({
      by: ['routeKey', 'planningWeekId'],
      where: orgScopedWhere(session, {
        planningWeek: {
          weekStart: { gte: startDate, lte: endDate },
        },
      }),
      _sum: {
        totalQty: true,
      },
    })

    // Get planning weeks for display (with org scoping)
    const planningWeeks = await prisma.planningWeek.findMany({
      where: orgScopedWhere(session, {
        weekStart: { gte: startDate, lte: endDate },
      }),
      select: { id: true, weekStart: true, weekNumber: true, year: true },
      orderBy: { weekStart: 'asc' },
    })

    // Get actual requests grouped by week and routeKey
    // Note: ActualShipperRequest doesn't have organizationId, so we can't scope it
    // This data comes from external Redash sources and still uses 'citym' field name
    const actuals = await prisma.actualShipperRequest.groupBy({
      by: ['citym'],
      where: {
        requestDate: { gte: startDate, lte: endDate },
      },
      _sum: {
        loadsRequested: true,
        loadsFulfilled: true,
      },
    })

    // Build accuracy report by routeKey
    const routeKeySet = new Set([
      ...forecasts.map(f => f.routeKey),
      ...actuals.map(a => a.citym),
    ])

    const forecastsByRouteKey = forecasts.reduce((acc, f) => {
      if (!acc[f.routeKey]) acc[f.routeKey] = 0
      acc[f.routeKey] += f._sum.totalQty ?? 0
      return acc
    }, {} as Record<string, number>)

    const actualsByRouteKey = actuals.reduce((acc, a) => {
      acc[a.citym] = {
        requested: a._sum?.loadsRequested ?? 0,
        fulfilled: a._sum?.loadsFulfilled ?? 0,
      }
      return acc
    }, {} as Record<string, { requested: number; fulfilled: number }>)

    const report = Array.from(routeKeySet).map(routeKey => {
      const forecasted = forecastsByRouteKey[routeKey] || 0
      const actual = actualsByRouteKey[routeKey]?.requested || 0
      const fulfilled = actualsByRouteKey[routeKey]?.fulfilled || 0

      const accuracy = forecasted > 0
        ? Math.round((actual / forecasted) * 100)
        : actual === 0 ? 100 : 0

      const variance = actual - forecasted
      const variancePercent = forecasted > 0
        ? Math.round((variance / forecasted) * 100)
        : 0

      return {
        routeKey,
        forecasted,
        actual,
        fulfilled,
        accuracy,
        variance,
        variancePercent,
      }
    })

    // Sort by variance (absolute value, highest first)
    report.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))

    // Calculate totals
    const totals = report.reduce(
      (acc, r) => ({
        forecasted: acc.forecasted + r.forecasted,
        actual: acc.actual + r.actual,
        fulfilled: acc.fulfilled + r.fulfilled,
      }),
      { forecasted: 0, actual: 0, fulfilled: 0 }
    )

    const overallAccuracy = totals.forecasted > 0
      ? Math.round((totals.actual / totals.forecasted) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        dateRange: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
        },
        weeks: planningWeeks.map(w => ({
          id: w.id,
          weekNumber: w.weekNumber,
          year: w.year,
          start: format(w.weekStart, 'MMM d'),
        })),
        report,
        totals: {
          ...totals,
          accuracy: overallAccuracy,
          variance: totals.actual - totals.forecasted,
        },
      },
    })
  } catch (error) {
    console.error('Forecast accuracy report error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate report' } },
      { status: 500 }
    )
  }
}
