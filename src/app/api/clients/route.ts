import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { createClientSchema, searchParamsSchema } from '@/lib/validations/repositories'
import { orgScopedWhere, orgScopedData } from '@/lib/org-scoped'
import { PartyRole } from '@prisma/client'
import { generateUniqueIdentifier } from '@/lib/generate-id'

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
      partyRole: PartyRole.CUSTOMER,
      ...(params.q && {
        name: { contains: params.q, mode: 'insensitive' as const },
      }),
      // Default to showing only active clients unless explicitly specified
      isActive: params.isActive !== undefined ? params.isActive : true,
    })

    const [clients, total] = await Promise.all([
      prisma.party.findMany({
        where,
        orderBy: { [params.sortBy || 'name']: params.sortOrder },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.party.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: clients,
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    })
  } catch (error) {
    console.error('Get clients error:', error)
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
    const validationResult = createClientSchema.safeParse(body)

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

    const { name, pointOfContact, email, phoneNumber } = validationResult.data

    // Check for duplicates within organization
    const existing = await prisma.party.findFirst({
      where: orgScopedWhere(session, {
        partyRole: PartyRole.CUSTOMER,
        name: { equals: name, mode: 'insensitive' },
      }),
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'DUPLICATE', message: 'A client with this name already exists' },
        },
        { status: 409 }
      )
    }

    // Generate unique identifier
    const uniqueIdentifier = generateUniqueIdentifier(PartyRole.CUSTOMER)

    const client = await prisma.party.create({
      data: orgScopedData(session, {
        name,
        uniqueIdentifier,
        pointOfContact,
        email,
        phoneNumber,
        partyRole: PartyRole.CUSTOMER,
        isActive: true,
      }),
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CLIENT_CREATED,
      entityType: 'Party',
      entityId: client.id,
      metadata: { name, partyRole: 'CUSTOMER' },
    })

    return NextResponse.json({ success: true, data: client }, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
