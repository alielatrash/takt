import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { orgScopedWhere } from '@/lib/org-scoped'

// Clean up orphaned supply commitments (commitments with no corresponding demand forecasts)
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    const { planningWeekId } = await request.json()

    if (!planningWeekId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Planning week ID is required' } },
        { status: 400 }
      )
    }

    // Get all supply commitments for this week (scoped to organization)
    const supplyCommitments = await prisma.supplyCommitment.findMany({
      where: orgScopedWhere(session, { planningWeekId }),
      select: { id: true, routeKey: true, planningWeekId: true },
    })

    // Check each commitment to see if there are any demand forecasts for that route
    const orphanedCommitments: string[] = []
    for (const commitment of supplyCommitments) {
      const forecastCount = await prisma.demandForecast.count({
        where: orgScopedWhere(session, {
          planningWeekId: commitment.planningWeekId,
          routeKey: commitment.routeKey,
        }),
      })

      if (forecastCount === 0) {
        orphanedCommitments.push(commitment.id)
      }
    }

    // Delete orphaned commitments
    if (orphanedCommitments.length > 0) {
      await prisma.supplyCommitment.deleteMany({
        where: {
          id: { in: orphanedCommitments },
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Cleaned up ${orphanedCommitments.length} orphaned supply commitment(s)`,
        deletedCount: orphanedCommitments.length,
      },
    })
  } catch (error) {
    console.error('Cleanup supply error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to cleanup supply commitments' } },
      { status: 500 }
    )
  }
}

// Alternative: Delete ALL supply commitments for a planning week
export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
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

    const result = await prisma.supplyCommitment.deleteMany({
      where: orgScopedWhere(session, { planningWeekId }),
    })

    return NextResponse.json({
      success: true,
      data: {
        message: `Deleted all ${result.count} supply commitment(s) for this week`,
        deletedCount: result.count,
      },
    })
  } catch (error) {
    console.error('Delete all supply error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete supply commitments' } },
      { status: 500 }
    )
  }
}
