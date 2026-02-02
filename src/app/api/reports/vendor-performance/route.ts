import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { orgScopedWhere } from '@/lib/org-scoped'

// Get vendor performance report data
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const partyId = searchParams.get('supplierId') || searchParams.get('partyId')
    const routeKey = searchParams.get('citym') || searchParams.get('routeKey')

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Get supply commitments (with org scoping)
    const commitments = await prisma.supplyCommitment.findMany({
      where: orgScopedWhere(session, {
        planningWeek: dateFilter.gte || dateFilter.lte ? {
          weekStart: dateFilter,
        } : undefined,
        partyId: partyId || undefined,
        routeKey: routeKey || undefined,
      }),
      include: {
        planningWeek: true,
        party: true,
      },
    })

    // Get fleet partner completions
    // Note: FleetPartnerCompletion doesn't have organizationId and uses 'citym' field
    const completions = await prisma.fleetPartnerCompletion.findMany({
      where: {
        completionDate: dateFilter.gte || dateFilter.lte ? dateFilter : undefined,
        citym: routeKey || undefined,
      },
    })

    // Group commitments by party and week
    const commitmentByPartyWeek = new Map<string, {
      partyId: string
      partyName: string
      weekStart: Date
      committed: number
      routes: Set<string>
    }>()

    for (const commitment of commitments) {
      const key = `${commitment.partyId}-${commitment.planningWeek.weekStart.toISOString()}`
      const existing = commitmentByPartyWeek.get(key)
      const totalCommitted = commitment.day1Committed + commitment.day2Committed +
        commitment.day3Committed + commitment.day4Committed + commitment.day5Committed +
        commitment.day6Committed + commitment.day7Committed

      if (existing) {
        existing.committed += totalCommitted
        existing.routes.add(commitment.routeKey)
      } else {
        commitmentByPartyWeek.set(key, {
          partyId: commitment.partyId,
          partyName: commitment.party?.name || 'Unknown',
          weekStart: commitment.planningWeek.weekStart,
          committed: totalCommitted,
          routes: new Set([commitment.routeKey]),
        })
      }
    }

    // Group completions by supplier name and week
    // Note: Completions from Redash may have supplier name but not ID
    const completionBySupplierWeek = new Map<string, number>()

    for (const completion of completions) {
      // Find the week start (Sunday) for this completion date
      const date = new Date(completion.completionDate)
      const dayOfWeek = date.getUTCDay()
      const weekStart = new Date(date)
      weekStart.setUTCDate(date.getUTCDate() - dayOfWeek)
      weekStart.setUTCHours(0, 0, 0, 0)

      // Match by supplier name (from Redash data)
      const supplierName = completion.supplierName || 'Unknown'
      const key = `${supplierName}-${weekStart.toISOString()}`
      const existing = completionBySupplierWeek.get(key) || 0
      completionBySupplierWeek.set(key, existing + completion.loadsCompleted)
    }

    // Calculate performance metrics
    const reportData: {
      partyId: string
      partyName: string
      weekStart: string
      committed: number
      completed: number
      variance: number
      fulfillmentRate: number
      routes: string[]
    }[] = []

    for (const [, commitment] of commitmentByPartyWeek) {
      // Try to find completions by party name
      const completionKey = `${commitment.partyName}-${commitment.weekStart.toISOString()}`
      const completed = completionBySupplierWeek.get(completionKey) || 0
      const variance = completed - commitment.committed
      const fulfillmentRate = commitment.committed > 0
        ? Math.round((completed / commitment.committed) * 100)
        : 0

      reportData.push({
        partyId: commitment.partyId,
        partyName: commitment.partyName,
        weekStart: commitment.weekStart.toISOString().split('T')[0],
        committed: commitment.committed,
        completed,
        variance,
        fulfillmentRate,
        routes: Array.from(commitment.routes),
      })
    }

    // Sort by week (newest first), then by party name
    reportData.sort((a, b) => {
      const weekCompare = b.weekStart.localeCompare(a.weekStart)
      if (weekCompare !== 0) return weekCompare
      return a.partyName.localeCompare(b.partyName)
    })

    // Calculate summary metrics
    const totalCommitted = reportData.reduce((sum, r) => sum + r.committed, 0)
    const totalCompleted = reportData.reduce((sum, r) => sum + r.completed, 0)
    const overallVariance = totalCompleted - totalCommitted
    const overallFulfillmentRate = totalCommitted > 0
      ? Math.round((totalCompleted / totalCommitted) * 100)
      : 0

    // Top performers (highest fulfillment rate)
    const partyPerformance = new Map<string, { committed: number; completed: number }>()
    for (const row of reportData) {
      const existing = partyPerformance.get(row.partyName) || { committed: 0, completed: 0 }
      existing.committed += row.committed
      existing.completed += row.completed
      partyPerformance.set(row.partyName, existing)
    }

    const topPerformers = Array.from(partyPerformance.entries())
      .map(([name, data]) => ({
        name,
        fulfillmentRate: data.committed > 0 ? Math.round((data.completed / data.committed) * 100) : 0,
        committed: data.committed,
        completed: data.completed,
      }))
      .sort((a, b) => b.fulfillmentRate - a.fulfillmentRate)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      data: reportData,
      summary: {
        totalCommitted,
        totalCompleted,
        overallVariance,
        overallFulfillmentRate,
        supplierCount: new Set(reportData.map(r => r.partyId)).size,
        weekCount: new Set(reportData.map(r => r.weekStart)).size,
        topPerformers,
      },
    })
  } catch (error) {
    console.error('Vendor performance report error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate report',
        },
      },
      { status: 500 }
    )
  }
}
