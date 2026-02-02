import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { orgScopedWhere } from '@/lib/org-scoped'
import { PartyRole } from '@prisma/client'

/**
 * Bulk delete multiple suppliers
 * POST /api/suppliers/bulk-delete
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

    // Deactivate all suppliers in a single query
    const result = await prisma.party.updateMany({
      where: orgScopedWhere(session, {
        id: { in: supplierIds },
        partyRole: PartyRole.SUPPLIER,
      }),
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        deleted: result.count,
      },
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete suppliers',
        },
      },
      { status: 500 }
    )
  }
}
