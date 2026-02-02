import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { orgScopedWhere } from '@/lib/org-scoped'

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
    const planningWeekId = searchParams.get('planningWeekId')

    if (!planningWeekId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'planningWeekId is required' } },
        { status: 400 }
      )
    }

    // Get all supply commitments for the week, grouped by supplier (with org scoping)
    const commitments = await prisma.supplyCommitment.findMany({
      where: orgScopedWhere(session, { planningWeekId }),
      include: {
        party: { select: { id: true, name: true } },
      },
      orderBy: [
        { party: { name: 'asc' } },
        { routeKey: 'asc' },
      ],
    })

    // Group by supplier
    const supplierMap = new Map<string, {
      partyId: string
      partyName: string
      routes: Array<{
        routeKey: string
        plan: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
      }>
      totals: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
    }>()

    for (const commitment of commitments) {
      const key = commitment.partyId

      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          partyId: commitment.party.id,
          partyName: commitment.party.name,
          routes: [],
          totals: { day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0, total: 0 },
        })
      }

      const supplier = supplierMap.get(key)!

      const routePlan = {
        day1: commitment.day1Committed,
        day2: commitment.day2Committed,
        day3: commitment.day3Committed,
        day4: commitment.day4Committed,
        day5: commitment.day5Committed,
        day6: commitment.day6Committed,
        day7: commitment.day7Committed,
        total: commitment.totalCommitted,
      }

      supplier.routes.push({
        routeKey: commitment.routeKey,
        plan: routePlan,
      })

      // Aggregate totals
      supplier.totals.day1 += commitment.day1Committed
      supplier.totals.day2 += commitment.day2Committed
      supplier.totals.day3 += commitment.day3Committed
      supplier.totals.day4 += commitment.day4Committed
      supplier.totals.day5 += commitment.day5Committed
      supplier.totals.day6 += commitment.day6Committed
      supplier.totals.day7 += commitment.day7Committed
      supplier.totals.total += commitment.totalCommitted
    }

    // Convert to array and sort by party name
    const dispatchData = Array.from(supplierMap.values()).sort((a, b) =>
      a.partyName.localeCompare(b.partyName)
    )

    // Calculate grand totals
    const grandTotals = {
      day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0, total: 0,
    }
    for (const supplier of dispatchData) {
      grandTotals.day1 += supplier.totals.day1
      grandTotals.day2 += supplier.totals.day2
      grandTotals.day3 += supplier.totals.day3
      grandTotals.day4 += supplier.totals.day4
      grandTotals.day5 += supplier.totals.day5
      grandTotals.day6 += supplier.totals.day6
      grandTotals.day7 += supplier.totals.day7
      grandTotals.total += supplier.totals.total
    }

    // Map field names to match frontend expectations
    const suppliers = dispatchData.map(supplier => ({
      supplierId: supplier.partyId,
      supplierName: supplier.partyName,
      routes: supplier.routes,
      totals: supplier.totals,
    }))

    return NextResponse.json({
      success: true,
      data: {
        suppliers,
        grandTotals,
      },
    })
  } catch (error) {
    console.error('Get dispatch data error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
