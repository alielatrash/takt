import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Check multiple truck types for active dependencies (forecasts and commitments) in a single request
 * POST /api/truck-types/check-dependencies-batch
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
    const { truckTypeIds } = body as { truckTypeIds: string[] }

    if (!Array.isArray(truckTypeIds) || truckTypeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'truckTypeIds must be a non-empty array' } },
        { status: 400 }
      )
    }

    console.log('[check-dependencies-batch] Checking dependencies for', truckTypeIds.length, 'truck types')
    console.log('[check-dependencies-batch] Organization ID:', session.user.currentOrgId)

    // Get forecast counts for truck types
    const forecasts = await prisma.demandForecast.groupBy({
      by: ['resourceTypeId'],
      where: {
        resourceTypeId: { in: truckTypeIds },
        organizationId: session.user.currentOrgId,
      },
      _count: {
        id: true,
      },
    })

    // Get commitment counts for truck types
    const commitments = await prisma.supplyCommitment.groupBy({
      by: ['resourceTypeId'],
      where: {
        resourceTypeId: { in: truckTypeIds },
        organizationId: session.user.currentOrgId,
      },
      _count: {
        id: true,
      },
    })

    console.log('[check-dependencies-batch] Found forecasts for', forecasts.length, 'truck types')
    console.log('[check-dependencies-batch] Found commitments for', commitments.length, 'truck types')

    // Build a map of truckTypeId -> total count (forecasts + commitments)
    const dependencyCounts = new Map<string, number>()

    forecasts.forEach((f) => {
      dependencyCounts.set(f.resourceTypeId, (dependencyCounts.get(f.resourceTypeId) || 0) + f._count.id)
    })

    commitments.forEach((c) => {
      if (c.resourceTypeId) {
        dependencyCounts.set(c.resourceTypeId, (dependencyCounts.get(c.resourceTypeId) || 0) + c._count.id)
      }
    })

    // Build response for each truck type
    const results = truckTypeIds.map((truckTypeId) => ({
      truckTypeId,
      hasActiveDependencies: dependencyCounts.has(truckTypeId),
      activeDependencyCount: dependencyCounts.get(truckTypeId) || 0,
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
