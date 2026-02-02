import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Check multiple clients for active dependencies (forecasts) in a single request
 * POST /api/clients/check-dependencies-batch
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
    const { clientIds } = body as { clientIds: string[] }

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'clientIds must be a non-empty array' } },
        { status: 400 }
      )
    }

    console.log('[check-dependencies-batch] Checking dependencies for', clientIds.length, 'clients')
    console.log('[check-dependencies-batch] Organization ID:', session.user.currentOrgId)

    // Get forecast counts for all clients in one query
    const forecasts = await prisma.demandForecast.groupBy({
      by: ['partyId'],
      where: {
        partyId: { in: clientIds },
        organizationId: session.user.currentOrgId,
      },
      _count: {
        id: true,
      },
    })

    console.log('[check-dependencies-batch] Found forecasts for', forecasts.length, 'clients')

    // Build a map of clientId -> forecast count
    const forecastCounts = new Map<string, number>()
    forecasts.forEach((f) => {
      forecastCounts.set(f.partyId, f._count.id)
    })

    // Build response for each client
    const results = clientIds.map((clientId) => ({
      clientId,
      hasActiveDependencies: forecastCounts.has(clientId),
      activeForecastCount: forecastCounts.get(clientId) || 0,
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
