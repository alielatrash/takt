import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { createTruckTypeSchema, searchParamsSchema } from '@/lib/validations/repositories'
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
    const params = searchParamsSchema.parse({
      q: searchParams.get('q'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      sortBy: searchParams.get('sortBy') || 'name',
      sortOrder: searchParams.get('sortOrder'),
      isActive: searchParams.get('isActive'),
    })

    const where = orgScopedWhere(session, {
      ...(params.q && {
        name: { contains: params.q, mode: 'insensitive' as const },
      }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    })

    const [truckTypes, total] = await Promise.all([
      prisma.resourceType.findMany({
        where,
        orderBy: { [params.sortBy || 'name']: params.sortOrder },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.resourceType.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: truckTypes,
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    })
  } catch (error) {
    console.error('Get truck types error:', error)
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

    const body = await request.json()
    const validationResult = createTruckTypeSchema.safeParse(body)

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

    const { name } = validationResult.data

    // Check for duplicates within organization
    const existing = await prisma.resourceType.findFirst({
      where: orgScopedWhere(session, {
        name: { equals: name, mode: 'insensitive' },
      }),
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'DUPLICATE', message: 'A truck type with this name already exists' },
        },
        { status: 409 }
      )
    }

    const truckType = await prisma.resourceType.create({
      data: orgScopedData(session, {
        name,
        isActive: true,
      }),
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.TRUCK_TYPE_CREATED,
      entityType: 'ResourceType',
      entityId: truckType.id,
      metadata: { name },
    })

    return NextResponse.json({ success: true, data: truckType }, { status: 201 })
  } catch (error) {
    console.error('Create truck type error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
