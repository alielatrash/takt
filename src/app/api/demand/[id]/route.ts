import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hasPermission } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { updateDemandForecastSchema } from '@/lib/validations/demand'
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
    const forecast = await prisma.demandForecast.findUnique({
      where: { id },
      include: {
        party: { select: { id: true, name: true } },
        pickupLocation: { select: { id: true, name: true, code: true, region: true } },
        dropoffLocation: { select: { id: true, name: true, code: true, region: true } },
        resourceType: { select: { id: true, name: true } },
        planningWeek: { select: { id: true, weekStart: true, weekEnd: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (!forecast) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Forecast not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, forecast)

    return NextResponse.json({ success: true, data: forecast })
  } catch (error) {
    console.error('Get demand forecast error:', error)
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

    if (!hasPermission(session.user.role, 'demand:write')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to update demand forecasts' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = updateDemandForecastSchema.safeParse(body)

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

    // Fetch only necessary fields for validation and calculation
    const existing = await prisma.demandForecast.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        day1Qty: true,
        day2Qty: true,
        day3Qty: true,
        day4Qty: true,
        day5Qty: true,
        day6Qty: true,
        day7Qty: true,
        week1Qty: true,
        week2Qty: true,
        week3Qty: true,
        week4Qty: true,
        week5Qty: true,
        planningWeekId: true,
        partyId: true,
        planningWeek: {
          select: { isLocked: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Forecast not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    if (existing.planningWeek.isLocked) {
      return NextResponse.json(
        { success: false, error: { code: 'LOCKED', message: 'This planning week is locked and cannot be edited' } },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Calculate new total for days (weekly planning)
    const day1 = data.day1Loads ?? existing.day1Qty
    const day2 = data.day2Loads ?? existing.day2Qty
    const day3 = data.day3Loads ?? existing.day3Qty
    const day4 = data.day4Loads ?? existing.day4Qty
    const day5 = data.day5Loads ?? existing.day5Qty
    const day6 = data.day6Loads ?? existing.day6Qty
    const day7 = data.day7Loads ?? existing.day7Qty
    const dayTotal = day1 + day2 + day3 + day4 + day5 + day6 + day7

    // Calculate new total for weeks (monthly planning)
    const week1 = data.week1Loads ?? existing.week1Qty
    const week2 = data.week2Loads ?? existing.week2Qty
    const week3 = data.week3Loads ?? existing.week3Qty
    const week4 = data.week4Loads ?? existing.week4Qty
    const week5 = data.week5Loads ?? existing.week5Qty
    const weekTotal = week1 + week2 + week3 + week4 + week5

    // Use whichever total is non-zero
    const totalQty = dayTotal > 0 ? dayTotal : weekTotal

    // Update without expensive includes - frontend will refetch via cache invalidation
    const forecast = await prisma.demandForecast.update({
      where: { id },
      data: {
        ...(data.day1Loads !== undefined && { day1Qty: data.day1Loads }),
        ...(data.day2Loads !== undefined && { day2Qty: data.day2Loads }),
        ...(data.day3Loads !== undefined && { day3Qty: data.day3Loads }),
        ...(data.day4Loads !== undefined && { day4Qty: data.day4Loads }),
        ...(data.day5Loads !== undefined && { day5Qty: data.day5Loads }),
        ...(data.day6Loads !== undefined && { day6Qty: data.day6Loads }),
        ...(data.day7Loads !== undefined && { day7Qty: data.day7Loads }),
        ...(data.week1Loads !== undefined && { week1Qty: data.week1Loads }),
        ...(data.week2Loads !== undefined && { week2Qty: data.week2Loads }),
        ...(data.week3Loads !== undefined && { week3Qty: data.week3Loads }),
        ...(data.week4Loads !== undefined && { week4Qty: data.week4Loads }),
        ...(data.week5Loads !== undefined && { week5Qty: data.week5Loads }),
        totalQty,
      },
      select: {
        id: true,
        planningWeekId: true,
        partyId: true,
        totalQty: true,
        updatedAt: true,
      },
    })

    // Create audit log asynchronously with minimal metadata
    createAuditLog({
      userId: session.user.id,
      action: AuditAction.DEMAND_UPDATED,
      entityType: 'DemandForecast',
      entityId: forecast.id,
      metadata: {
        partyId: existing.partyId,
        planningWeekId: existing.planningWeekId,
        changes: data,
      },
    }).catch((err) => console.error('Failed to create audit log:', err))

    return NextResponse.json({ success: true, data: forecast })
  } catch (error) {
    console.error('Update demand forecast error:', error)
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

    if (!hasPermission(session.user.role, 'demand:write')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to delete demand forecasts' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await prisma.demandForecast.findUnique({
      where: { id },
      include: { planningWeek: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Forecast not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    if (existing.planningWeek.isLocked) {
      return NextResponse.json(
        { success: false, error: { code: 'LOCKED', message: 'This planning week is locked and cannot be edited' } },
        { status: 400 }
      )
    }

    // Delete the forecast
    await prisma.demandForecast.delete({ where: { id } })

    // Check if there are any remaining forecasts for this route (routeKey) in this planning week
    const remainingForecasts = await prisma.demandForecast.count({
      where: {
        organizationId: session.user.currentOrgId,
        planningWeekId: existing.planningWeekId,
        routeKey: existing.routeKey,
      },
    })

    // If no forecasts remain for this route, cascade delete related supply commitments
    let suppliesDeleted = 0
    if (remainingForecasts === 0) {
      const result = await prisma.supplyCommitment.deleteMany({
        where: {
          organizationId: session.user.currentOrgId,
          planningWeekId: existing.planningWeekId,
          routeKey: existing.routeKey,
        },
      })
      suppliesDeleted = result.count
    }

    // Create audit log asynchronously (don't block the response)
    createAuditLog({
      userId: session.user.id,
      action: AuditAction.DEMAND_DELETED,
      entityType: 'DemandForecast',
      entityId: id,
      metadata: {
        routeKey: existing.routeKey,
        partyId: existing.partyId,
        cascadedSupplyDelete: suppliesDeleted > 0,
        suppliesDeletedCount: suppliesDeleted
      },
    }).catch((err) => console.error('Failed to create audit log:', err))

    return NextResponse.json({ success: true, data: { message: 'Forecast deleted' } })
  } catch (error) {
    console.error('Delete demand forecast error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
