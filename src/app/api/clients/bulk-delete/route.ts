import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { orgScopedWhere } from '@/lib/org-scoped'
import { PartyRole } from '@prisma/client'

/**
 * Bulk delete multiple clients
 * POST /api/clients/bulk-delete
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

    // Deactivate all clients in a single query
    const result = await prisma.party.updateMany({
      where: orgScopedWhere(session, {
        id: { in: clientIds },
        partyRole: PartyRole.CUSTOMER,
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
          message: 'Failed to delete clients',
        },
      },
      { status: 500 }
    )
  }
}
