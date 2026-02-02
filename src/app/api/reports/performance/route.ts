import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'
import { orgScopedWhere } from '@/lib/org-scoped'

// Vendor Performance Report: Compare supply commitments vs actual completions
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const weeksBack = parseInt(searchParams.get('weeks') || '4', 10)

    // Get date range
    const now = new Date()
    const startDate = subWeeks(startOfWeek(now, { weekStartsOn: 0 }), weeksBack)
    const endDate = endOfWeek(now, { weekStartsOn: 0 })

    // Get commitments grouped by party (supplier) with org scoping
    const commitments = await prisma.supplyCommitment.groupBy({
      by: ['partyId'],
      where: orgScopedWhere(session, {
        planningWeek: {
          weekStart: { gte: startDate, lte: endDate },
        },
      }),
      _sum: {
        totalCommitted: true,
      },
    })

    // Get party (supplier) details
    const partyIds = commitments.map((c) => c.partyId)
    const parties = await prisma.party.findMany({
      where: orgScopedWhere(session, { id: { in: partyIds } }),
      select: { id: true, name: true },
    })

    const partyMap = parties.reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {} as Record<string, { id: string; name: string }>)

    // Get actual completions by supplier name (since we match by name from Redash)
    // Note: FleetPartnerCompletion doesn't have organizationId
    const completions = await prisma.fleetPartnerCompletion.groupBy({
      by: ['supplierName'],
      where: {
        completionDate: { gte: startDate, lte: endDate },
        supplierName: { not: null },
      },
      _sum: {
        loadsCompleted: true,
      },
    })

    // Create lookup map for completions by supplier name
    const completionsMap = completions.reduce((acc, item) => {
      if (item.supplierName) {
        acc[item.supplierName.toLowerCase()] = item._sum.loadsCompleted ?? 0
      }
      return acc
    }, {} as Record<string, number>)

    // Build performance report
    const report = commitments.map((commitment) => {
      const party = partyMap[commitment.partyId]
      const committed = commitment._sum.totalCommitted ?? 0

      // Try to match party name (case-insensitive)
      const completed = party
        ? completionsMap[party.name.toLowerCase()] ?? 0
        : 0

      const performanceRate = committed > 0
        ? Math.round((completed / committed) * 100)
        : 0

      const variance = completed - committed

      return {
        partyId: commitment.partyId,
        partyName: party?.name ?? 'Unknown',
        committed,
        completed,
        performanceRate,
        variance,
        status: performanceRate >= 90 ? 'good' : performanceRate >= 70 ? 'warning' : 'poor',
      }
    })

    // Sort by performance rate (lowest first to highlight problem areas)
    report.sort((a, b) => a.performanceRate - b.performanceRate)

    // Calculate totals
    const totals = report.reduce(
      (acc, item) => ({
        committed: acc.committed + item.committed,
        completed: acc.completed + item.completed,
      }),
      { committed: 0, completed: 0 }
    )

    const overallPerformance = totals.committed > 0
      ? Math.round((totals.completed / totals.committed) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        dateRange: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
        },
        suppliers: report,
        totals: {
          ...totals,
          overallPerformance,
          supplierCount: report.length,
        },
      },
    })
  } catch (error) {
    console.error('Vendor performance report error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
