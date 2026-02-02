import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { getSuperadminStats } from '@/lib/superadmin-stats'

/**
 * GET /api/superadmin/stats
 *
 * Get platform-wide statistics for the dashboard
 * Platform admin only
 */
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin()

    const { searchParams } = request.nextUrl
    const days = parseInt(searchParams.get('days') || '30')

    const data = await getSuperadminStats(days)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Superadmin stats error:', error)

    if (error.message.includes('FORBIDDEN')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Platform admin access required' },
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' },
      },
      { status: 500 }
    )
  }
}
