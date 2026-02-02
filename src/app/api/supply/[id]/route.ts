import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hasPermission } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { updateSupplyCommitmentSchema } from '@/lib/validations/supply'
import { notifyDemandPlannerOfSupply } from '@/lib/notifications'
import { verifyOrgOwnership } from '@/lib/org-scoped'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const commitment = await prisma.supplyCommitment.findUnique({
      where: { id },
      include: {
        party: { select: { id: true, name: true } },
        resourceType: { select: { id: true, name: true } },
        planningWeek: { select: { id: true, weekStart: true, weekEnd: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (!commitment) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Commitment not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, commitment)

    return NextResponse.json({ success: true, data: commitment })
  } catch (error) {
    console.error('Get supply commitment error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to update supply commitments' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = updateSupplyCommitmentSchema.safeParse(body)

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

    const existing = await prisma.supplyCommitment.findUnique({
      where: { id },
      include: { planningWeek: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Commitment not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    if (existing.planningWeek.isLocked) {
      return NextResponse.json(
        { success: false, error: { code: 'LOCKED', message: 'This planning week is locked' } },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Calculate new total - handle both day and week fields
    const day1 = data.day1Committed ?? existing.day1Committed
    const day2 = data.day2Committed ?? existing.day2Committed
    const day3 = data.day3Committed ?? existing.day3Committed
    const day4 = data.day4Committed ?? existing.day4Committed
    const day5 = data.day5Committed ?? existing.day5Committed
    const day6 = data.day6Committed ?? existing.day6Committed
    const day7 = data.day7Committed ?? existing.day7Committed
    const dayTotal = day1 + day2 + day3 + day4 + day5 + day6 + day7

    const week1 = data.week1Committed ?? existing.week1Committed
    const week2 = data.week2Committed ?? existing.week2Committed
    const week3 = data.week3Committed ?? existing.week3Committed
    const week4 = data.week4Committed ?? existing.week4Committed
    const week5 = data.week5Committed ?? existing.week5Committed
    const weekTotal = week1 + week2 + week3 + week4 + week5

    const totalCommitted = dayTotal > 0 ? dayTotal : weekTotal

    const commitment = await prisma.supplyCommitment.update({
      where: { id },
      data: {
        ...data,
        totalCommitted,
      },
      include: {
        party: { select: { id: true, name: true } },
        resourceType: { select: { id: true, name: true } },
        planningWeek: { select: { id: true, weekStart: true, weekEnd: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.SUPPLY_UPDATED,
      entityType: 'SupplyCommitment',
      entityId: commitment.id,
      metadata: { before: existing, after: commitment },
    })

    // Notify demand planners who created forecasts for this route
    notifyDemandPlannerOfSupply(
      commitment.id,
      commitment.routeKey,
      commitment.party.name,
      `${session.user.firstName} ${session.user.lastName}`,
      commitment.planningWeekId
    ).catch((err) => console.error('Failed to send notifications:', err))

    return NextResponse.json({ success: true, data: commitment })
  } catch (error) {
    console.error('Update supply commitment error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to delete supply commitments' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await prisma.supplyCommitment.findUnique({
      where: { id },
      include: { planningWeek: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Commitment not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    if (existing.planningWeek.isLocked) {
      return NextResponse.json(
        { success: false, error: { code: 'LOCKED', message: 'This planning week is locked' } },
        { status: 400 }
      )
    }

    await prisma.supplyCommitment.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.SUPPLY_DELETED,
      entityType: 'SupplyCommitment',
      entityId: id,
      metadata: { routeKey: existing.routeKey, partyId: existing.partyId },
    })

    return NextResponse.json({ success: true, data: { message: 'Commitment deleted' } })
  } catch (error) {
    console.error('Delete supply commitment error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
