import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { orgScopedWhere } from '@/lib/org-scoped'

/**
 * Bulk delete multiple cities
 * POST /api/cities/bulk-delete
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

    // Deactivate all cities in a single query
    const result = await prisma.location.updateMany({
      where: orgScopedWhere(session, {
        id: { in: cityIds },
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
          message: 'Failed to delete cities',
        },
      },
      { status: 500 }
    )
  }
}
