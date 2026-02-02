import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Check multiple cities for active dependencies (demand forecasts) in a single request
 * POST /api/cities/check-dependencies-batch
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { cityIds } = body as { cityIds: string[] }

    if (!Array.isArray(cityIds) || cityIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'cityIds must be a non-empty array' } },
        { status: 400 }
      )
    }

    console.log('[check-dependencies-batch] Checking dependencies for', cityIds.length, 'cities')
    console.log('[check-dependencies-batch] Organization ID:', session.user.currentOrgId)

    // Get forecast counts for cities used as pickup locations
    const pickupForecasts = await prisma.demandForecast.groupBy({
      by: ['pickupLocationId'],
      where: {
        pickupLocationId: { in: cityIds },
        organizationId: session.user.currentOrgId,
      },
      _count: {
        id: true,
      },
    })

    // Get forecast counts for cities used as dropoff locations
    const dropoffForecasts = await prisma.demandForecast.groupBy({
      by: ['dropoffLocationId'],
      where: {
        dropoffLocationId: { in: cityIds },
        organizationId: session.user.currentOrgId,
      },
      _count: {
        id: true,
      },
    })

    console.log('[check-dependencies-batch] Found pickup forecasts for', pickupForecasts.length, 'cities')
    console.log('[check-dependencies-batch] Found dropoff forecasts for', dropoffForecasts.length, 'cities')

    // Build a map of cityId -> forecast count
    const forecastCounts = new Map<string, number>()

    pickupForecasts.forEach((f) => {
      forecastCounts.set(f.pickupLocationId, (forecastCounts.get(f.pickupLocationId) || 0) + f._count.id)
    })

    dropoffForecasts.forEach((f) => {
      forecastCounts.set(f.dropoffLocationId, (forecastCounts.get(f.dropoffLocationId) || 0) + f._count.id)
    })

    // Build response for each city
    const results = cityIds.map((cityId) => ({
      cityId,
      hasActiveDependencies: forecastCounts.has(cityId),
      activeForecastCount: forecastCounts.get(cityId) || 0,
    }))

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Batch check dependencies error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check dependencies',
        },
      },
      { status: 500 }
    )
  }
}
