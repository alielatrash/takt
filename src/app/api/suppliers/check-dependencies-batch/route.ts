import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Check multiple suppliers for active dependencies (supply commitments) in a single request
 * POST /api/suppliers/check-dependencies-batch
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
    const { supplierIds } = body as { supplierIds: string[] }

    if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'supplierIds must be a non-empty array' } },
        { status: 400 }
      )
    }

    console.log('[check-dependencies-batch] Checking dependencies for', supplierIds.length, 'suppliers')
    console.log('[check-dependencies-batch] Organization ID:', session.user.currentOrgId)

    // Get supply commitment counts for all suppliers in one query
    const commitments = await prisma.supplyCommitment.groupBy({
      by: ['partyId'],
      where: {
        partyId: { in: supplierIds },
        organizationId: session.user.currentOrgId,
      },
      _count: {
        id: true,
      },
    })

    console.log('[check-dependencies-batch] Found commitments for', commitments.length, 'suppliers')

    // Build a map of supplierId -> commitment count
    const commitmentCounts = new Map<string, number>()
    commitments.forEach((c) => {
      commitmentCounts.set(c.partyId, c._count.id)
    })

    // Build response for each supplier
    const results = supplierIds.map((supplierId) => ({
      supplierId,
      hasActiveDependencies: commitmentCounts.has(supplierId),
      activeCommitmentCount: commitmentCounts.get(supplierId) || 0,
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
