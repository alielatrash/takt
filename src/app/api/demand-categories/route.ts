import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { createDemandCategorySchema, searchParamsSchema } from '@/lib/validations/repositories'
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
        OR: [
          { name: { contains: params.q, mode: 'insensitive' as const } },
          { code: { contains: params.q, mode: 'insensitive' as const } },
        ],
      }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    })

    const [categories, total] = await Promise.all([
      prisma.demandCategory.findMany({
        where,
        orderBy: { [params.sortBy || 'name']: params.sortOrder },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.demandCategory.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: categories,
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    })
  } catch (error) {
    console.error('Get demand categories error:', error)
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
    const validationResult = createDemandCategorySchema.safeParse(body)

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

    const { name, code } = validationResult.data

    // Check for duplicates within organization
    const existing = await prisma.demandCategory.findFirst({
      where: orgScopedWhere(session, {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          ...(code ? [{ code: { equals: code, mode: 'insensitive' as const } }] : []),
        ],
      }),
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'DUPLICATE', message: 'A category with this name or code already exists' },
        },
        { status: 409 }
      )
    }

    const category = await prisma.demandCategory.create({
      data: orgScopedData(session, {
        name,
        code,
        isActive: true,
      }),
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DEMAND_CATEGORY_CREATED,
      entityType: 'DemandCategory',
      entityId: category.id,
      metadata: { name, code },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('Create demand category error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
