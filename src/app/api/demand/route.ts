import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hasPermission } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { generateCitym } from '@/lib/citym'
import { createDemandForecastSchema } from '@/lib/validations/demand'
import { notifySupplyPlannersOfDemand } from '@/lib/notifications'
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
    const partyId = searchParams.get('clientId') // For backward compatibility, still accept clientId param
    const routeKey = searchParams.get('citym') || searchParams.get('routeKey') // Support both old and new names
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    const where = orgScopedWhere(session, {
      ...(planningWeekId && { planningWeekId }),
      ...(partyId && { partyId }),
      ...(routeKey && { routeKey }),
    })

    // Fetch forecasts without includes first (much faster)
    const [totalCount, forecasts] = await Promise.all([
      prisma.demandForecast.count({ where }),
      prisma.demandForecast.findMany({
        where,
        orderBy: [
          { partyId: 'asc' },
          { routeKey: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    if (forecasts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      })
    }

    // Collect unique IDs for batch fetching
    const partyIds = [...new Set(forecasts.map(f => f.partyId))]
    const pickupLocationIds = [...new Set(forecasts.map(f => f.pickupLocationId))]
    const dropoffLocationIds = [...new Set(forecasts.map(f => f.dropoffLocationId))]
    const resourceTypeIds = [...new Set(forecasts.map(f => f.resourceTypeId))]
    const planningWeekIds = [...new Set(forecasts.map(f => f.planningWeekId))]
    const createdByIds = [...new Set(forecasts.map(f => f.createdById))]

    // Batch fetch all related data in parallel (with org scoping)
    const [parties, pickupLocations, dropoffLocations, resourceTypes, planningWeeks, users] = await Promise.all([
      prisma.party.findMany({
        where: orgScopedWhere(session, { id: { in: partyIds } }),
        select: { id: true, name: true },
      }),
      prisma.location.findMany({
        where: orgScopedWhere(session, { id: { in: pickupLocationIds } }),
        select: { id: true, name: true, code: true, region: true },
      }),
      prisma.location.findMany({
        where: orgScopedWhere(session, { id: { in: dropoffLocationIds } }),
        select: { id: true, name: true, code: true, region: true },
      }),
      prisma.resourceType.findMany({
        where: orgScopedWhere(session, { id: { in: resourceTypeIds } }),
        select: { id: true, name: true },
      }),
      prisma.planningWeek.findMany({
        where: orgScopedWhere(session, { id: { in: planningWeekIds } }),
        select: { id: true, weekStart: true, weekEnd: true, year: true, weekNumber: true },
      }),
      prisma.user.findMany({
        where: { id: { in: createdByIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
    ])

    // Create lookup maps for O(1) access
    const partyMap = new Map(parties.map(p => [p.id, p]))
    const pickupLocationMap = new Map(pickupLocations.map(l => [l.id, l]))
    const dropoffLocationMap = new Map(dropoffLocations.map(l => [l.id, l]))
    const resourceTypeMap = new Map(resourceTypes.map(r => [r.id, r]))
    const planningWeekMap = new Map(planningWeeks.map(w => [w.id, w]))
    const userMap = new Map(users.map(u => [u.id, u]))

    // Combine data in memory (use new field names but keep old names for backward compatibility)
    const forecastsWithRelations = forecasts.map(forecast => ({
      ...forecast,
      party: partyMap.get(forecast.partyId)!,
      client: partyMap.get(forecast.partyId)!, // Backward compatibility
      pickupLocation: pickupLocationMap.get(forecast.pickupLocationId)!,
      pickupCity: pickupLocationMap.get(forecast.pickupLocationId)!, // Backward compatibility
      dropoffLocation: dropoffLocationMap.get(forecast.dropoffLocationId)!,
      dropoffCity: dropoffLocationMap.get(forecast.dropoffLocationId)!, // Backward compatibility
      resourceType: resourceTypeMap.get(forecast.resourceTypeId)!,
      truckType: resourceTypeMap.get(forecast.resourceTypeId)!, // Backward compatibility
      planningWeek: planningWeekMap.get(forecast.planningWeekId)!,
      createdBy: userMap.get(forecast.createdById)!,
    }))

    const totalPages = Math.ceil(totalCount / pageSize)

    return NextResponse.json({
      success: true,
      data: forecastsWithRelations,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Get demand forecasts error:', error)
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

    // Check permission
    if (!hasPermission(session.user.role, 'demand:write')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to create demand forecasts' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createDemandForecastSchema.safeParse(body)

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

    // Run all validation queries in parallel (with org scoping)
    const [planningWeek, pickupLocation, dropoffLocation, existing] = await Promise.all([
      prisma.planningWeek.findFirst({ where: orgScopedWhere(session, { id: data.planningWeekId }) }),
      prisma.location.findFirst({ where: orgScopedWhere(session, { id: data.pickupCityId }), select: { name: true } }),
      prisma.location.findFirst({ where: orgScopedWhere(session, { id: data.dropoffCityId }), select: { name: true } }),
      prisma.demandForecast.findFirst({
        where: orgScopedWhere(session, {
          planningWeekId: data.planningWeekId,
          partyId: data.clientId,
          pickupLocationId: data.pickupCityId,
          dropoffLocationId: data.dropoffCityId,
          resourceTypeId: data.truckTypeId,
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
        { success: false, error: { code: 'LOCKED', message: 'This planning week is locked and cannot be edited' } },
        { status: 400 }
      )
    }

    if (!pickupLocation || !dropoffLocation) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } },
        { status: 404 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'A forecast for this route and party already exists' } },
        { status: 409 }
      )
    }

    const routeKey = generateCitym(pickupLocation.name, dropoffLocation.name)

    // Calculate total based on which fields are populated (weekly vs monthly planning)
    const dayTotal = (data.day1Loads || 0) + (data.day2Loads || 0) + (data.day3Loads || 0) +
                      (data.day4Loads || 0) + (data.day5Loads || 0) + (data.day6Loads || 0) + (data.day7Loads || 0)
    const weekTotal = (data.week1Loads || 0) + (data.week2Loads || 0) + (data.week3Loads || 0) +
                       (data.week4Loads || 0) + (data.week5Loads || 0)
    const totalQty = dayTotal > 0 ? dayTotal : weekTotal

    const forecast = await prisma.demandForecast.create({
      data: orgScopedData(session, {
        planningWeekId: data.planningWeekId,
        partyId: data.clientId,
        pickupLocationId: data.pickupCityId,
        dropoffLocationId: data.dropoffCityId,
        vertical: data.vertical,
        resourceTypeId: data.truckTypeId,
        day1Qty: data.day1Loads || 0,
        day2Qty: data.day2Loads || 0,
        day3Qty: data.day3Loads || 0,
        day4Qty: data.day4Loads || 0,
        day5Qty: data.day5Loads || 0,
        day6Qty: data.day6Loads || 0,
        day7Qty: data.day7Loads || 0,
        week1Qty: data.week1Loads || 0,
        week2Qty: data.week2Loads || 0,
        week3Qty: data.week3Loads || 0,
        week4Qty: data.week4Loads || 0,
        week5Qty: data.week5Loads || 0,
        routeKey,
        totalQty,
        createdById: session.user.id,
      }),
      include: {
        party: { select: { id: true, name: true } },
        pickupLocation: { select: { id: true, name: true, code: true, region: true } },
        dropoffLocation: { select: { id: true, name: true, code: true, region: true } },
        resourceType: { select: { id: true, name: true } },
        planningWeek: { select: { id: true, weekStart: true, weekEnd: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Create audit log asynchronously (don't block the response)
    createAuditLog({
      userId: session.user.id,
      action: AuditAction.DEMAND_CREATED,
      entityType: 'DemandForecast',
      entityId: forecast.id,
      metadata: { routeKey, totalQty, partyId: data.clientId },
    }).catch((err) => console.error('Failed to create audit log:', err))

    // Notify supply planners of new demand forecast
    notifySupplyPlannersOfDemand(
      forecast.id,
      forecast.party.name,
      routeKey,
      `${session.user.firstName} ${session.user.lastName}`
    ).catch((err) => console.error('Failed to send notifications:', err))

    return NextResponse.json({ success: true, data: forecast }, { status: 201 })
  } catch (error) {
    console.error('Create demand forecast error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
