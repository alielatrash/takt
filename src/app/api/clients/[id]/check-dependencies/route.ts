import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Check if a client has active dependencies (forecasts)
 * GET /api/clients/:id/check-dependencies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const clientId = params.id

    // Check for demand forecasts
    const activeForecastCount = await prisma.demandForecast.count({
      where: {
        partyId: clientId,
        organizationId: session.user.currentOrgId,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        hasActiveDependencies: activeForecastCount > 0,
        activeForecastCount,
      },
    })
  } catch (error) {
    console.error('Check dependencies error:', error)
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
