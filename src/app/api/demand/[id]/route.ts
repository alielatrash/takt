import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hasPermission } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { updateDemandForecastSchema } from '@/lib/validations/demand'

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
        client: { select: { id: true, name: true, code: true } },
        pickupCity: { select: { id: true, name: true, code: true, region: true } },
        dropoffCity: { select: { id: true, name: true, code: true, region: true } },
        truckType: { select: { id: true, name: true } },
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
        day1Loads: true,
        day2Loads: true,
        day3Loads: true,
        day4Loads: true,
        day5Loads: true,
        day6Loads: true,
        day7Loads: true,
        planningWeekId: true,
        clientId: true,
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

    if (existing.planningWeek.isLocked) {
      return NextResponse.json(
        { success: false, error: { code: 'LOCKED', message: 'This planning week is locked and cannot be edited' } },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Calculate new total
    const day1 = data.day1Loads ?? existing.day1Loads
    const day2 = data.day2Loads ?? existing.day2Loads
    const day3 = data.day3Loads ?? existing.day3Loads
    const day4 = data.day4Loads ?? existing.day4Loads
    const day5 = data.day5Loads ?? existing.day5Loads
    const day6 = data.day6Loads ?? existing.day6Loads
    const day7 = data.day7Loads ?? existing.day7Loads
    const totalLoads = day1 + day2 + day3 + day4 + day5 + day6 + day7

    // Update without expensive includes - frontend will refetch via cache invalidation
    const forecast = await prisma.demandForecast.update({
      where: { id },
      data: {
        ...data,
        totalLoads,
      },
      select: {
        id: true,
        planningWeekId: true,
        clientId: true,
        totalLoads: true,
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
        clientId: existing.clientId,
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

    if (existing.planningWeek.isLocked) {
      return NextResponse.json(
        { success: false, error: { code: 'LOCKED', message: 'This planning week is locked and cannot be edited' } },
        { status: 400 }
      )
    }

    // Delete the forecast
    await prisma.demandForecast.delete({ where: { id } })

    // Check if there are any remaining forecasts for this route (citym) in this planning week
    const remainingForecasts = await prisma.demandForecast.count({
      where: {
        planningWeekId: existing.planningWeekId,
        citym: existing.citym,
      },
    })

    // If no forecasts remain for this route, cascade delete related supply commitments
    let suppliesDeleted = 0
    if (remainingForecasts === 0) {
      const result = await prisma.supplyCommitment.deleteMany({
        where: {
          planningWeekId: existing.planningWeekId,
          citym: existing.citym,
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
        citym: existing.citym,
        clientId: existing.clientId,
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
