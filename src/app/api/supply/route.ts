import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hasPermission } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { createSupplyCommitmentSchema } from '@/lib/validations/supply'
import { notifyDemandPlannerOfSupply } from '@/lib/notifications'
import { orgScopedWhere, orgScopedData } from '@/lib/org-scoped'

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
    const routeKey = searchParams.get('citym') || searchParams.get('routeKey')
    const partyId = searchParams.get('supplierId') || searchParams.get('partyId')

    const where = orgScopedWhere(session, {
      ...(planningWeekId && { planningWeekId }),
      ...(routeKey && { routeKey }),
      ...(partyId && { partyId }),
    })

    const commitments = await prisma.supplyCommitment.findMany({
      where,
      include: {
        party: { select: { id: true, name: true } },
        resourceType: { select: { id: true, name: true } },
        planningWeek: { select: { id: true, weekStart: true, weekEnd: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [
        { routeKey: 'asc' },
        { party: { name: 'asc' } },
      ],
    })

    return NextResponse.json({
      success: true,
      data: commitments,
    })
  } catch (error) {
    console.error('Get supply commitments error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    if (!hasPermission(session.user.role, 'supply:write')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to create supply commitments' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createSupplyCommitmentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validationResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Run validation queries in parallel (with org scoping)
    const [planningWeek, existing] = await Promise.all([
      prisma.planningWeek.findFirst({ where: orgScopedWhere(session, { id: data.planningWeekId }) }),
      prisma.supplyCommitment.findFirst({
        where: orgScopedWhere(session, {
          planningWeekId: data.planningWeekId,
          partyId: data.supplierId,
          routeKey: data.routeKey,
          resourceTypeId: data.truckTypeId || null,
        }),
      }),
    ])

    if (!planningWeek) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Planning week not found' } },
        { status: 404 }
      )
    }

    if (planningWeek.isLocked) {
      return NextResponse.json(
        { success: false, error: { code: 'LOCKED', message: 'This planning week is locked' } },
        { status: 400 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'A commitment for this supplier and route already exists' } },
        { status: 409 }
      )
    }

    // Calculate total from either day or week fields
    const dayTotal = (data.day1Committed || 0) + (data.day2Committed || 0) + (data.day3Committed || 0) +
                     (data.day4Committed || 0) + (data.day5Committed || 0) + (data.day6Committed || 0) + (data.day7Committed || 0)
    const weekTotal = (data.week1Committed || 0) + (data.week2Committed || 0) + (data.week3Committed || 0) +
                      (data.week4Committed || 0) + (data.week5Committed || 0)
    const totalCommitted = dayTotal > 0 ? dayTotal : weekTotal

    const commitment = await prisma.supplyCommitment.create({
      data: orgScopedData(session, {
        planningWeekId: data.planningWeekId,
        partyId: data.supplierId,
        routeKey: data.routeKey,
        resourceTypeId: data.truckTypeId,
        day1Committed: data.day1Committed || 0,
        day2Committed: data.day2Committed || 0,
        day3Committed: data.day3Committed || 0,
        day4Committed: data.day4Committed || 0,
        day5Committed: data.day5Committed || 0,
        day6Committed: data.day6Committed || 0,
        day7Committed: data.day7Committed || 0,
        week1Committed: data.week1Committed || 0,
        week2Committed: data.week2Committed || 0,
        week3Committed: data.week3Committed || 0,
        week4Committed: data.week4Committed || 0,
        week5Committed: data.week5Committed || 0,
        totalCommitted,
        createdById: session.user.id,
      }),
      include: {
        party: { select: { id: true, name: true } },
        resourceType: { select: { id: true, name: true } },
        planningWeek: { select: { id: true, weekStart: true, weekEnd: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Create audit log asynchronously (don't block the response)
    createAuditLog({
      userId: session.user.id,
      action: AuditAction.SUPPLY_COMMITTED,
      entityType: 'SupplyCommitment',
      entityId: commitment.id,
      metadata: { routeKey: data.routeKey, totalCommitted, partyId: data.supplierId },
    }).catch((err) => console.error('Failed to create audit log:', err))

    // Notify demand planners who created forecasts for this route
    notifyDemandPlannerOfSupply(
      commitment.id,
      data.routeKey,
      commitment.party.name,
      `${session.user.firstName} ${session.user.lastName}`,
      data.planningWeekId
    ).catch((err) => console.error('Failed to send notifications:', err))

    return NextResponse.json({ success: true, data: commitment }, { status: 201 })
  } catch (error) {
    console.error('Create supply commitment error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
