import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { updateTruckTypeSchema } from '@/lib/validations/repositories'
import { orgScopedWhere, verifyOrgOwnership } from '@/lib/org-scoped'

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
    const truckType = await prisma.resourceType.findUnique({ where: { id } })

    if (!truckType) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Truck type not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, truckType)

    return NextResponse.json({ success: true, data: truckType })
  } catch (error) {
    console.error('Get truck type error:', error)
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

    const { id } = await params
    const body = await request.json()
    const validationResult = updateTruckTypeSchema.safeParse(body)

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

    const existing = await prisma.resourceType.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Truck type not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    const { name } = validationResult.data

    // Check for duplicates within organization (excluding current record)
    if (name) {
      const duplicate = await prisma.resourceType.findFirst({
        where: orgScopedWhere(session, {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        }),
      })

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'DUPLICATE', message: 'A truck type with this name already exists' },
          },
          { status: 409 }
        )
      }
    }

    const truckType = await prisma.resourceType.update({
      where: { id },
      data: validationResult.data,
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.TRUCK_TYPE_UPDATED,
      entityType: 'ResourceType',
      entityId: truckType.id,
      metadata: { before: existing, after: truckType },
    })

    return NextResponse.json({ success: true, data: truckType })
  } catch (error) {
    console.error('Update truck type error:', error)
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

    const { id } = await params
    const existing = await prisma.resourceType.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Truck type not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    // Soft delete by setting isActive to false
    const truckType = await prisma.resourceType.update({
      where: { id },
      data: { isActive: false },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.TRUCK_TYPE_DELETED,
      entityType: 'ResourceType',
      entityId: truckType.id,
      metadata: { name: existing.name },
    })

    return NextResponse.json({ success: true, data: { message: 'Truck type deactivated' } })
  } catch (error) {
    console.error('Delete truck type error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
