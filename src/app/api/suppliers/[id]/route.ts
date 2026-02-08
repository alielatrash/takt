import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { updateSupplierSchema } from '@/lib/validations/repositories'
import { orgScopedWhere, verifyOrgOwnership } from '@/lib/org-scoped'
import { PartyRole } from '@prisma/client'

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
    const supplier = await prisma.party.findUnique({ where: { id } })

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    // Verify ownership and party role
    verifyOrgOwnership(session, supplier)
    if (supplier.partyRole !== PartyRole.SUPPLIER) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('Get supplier error:', error)
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
    const validationResult = updateSupplierSchema.safeParse(body)

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

    const existing = await prisma.party.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    // Verify ownership and party role
    verifyOrgOwnership(session, existing)
    if (existing.partyRole !== PartyRole.SUPPLIER) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    const { name, pointOfContact, email, phoneNumber, capacity, capacityType } = validationResult.data

    // Check for duplicates within organization (excluding current record)
    if (name) {
      const duplicate = await prisma.party.findFirst({
        where: orgScopedWhere(session, {
          id: { not: id },
          partyRole: PartyRole.SUPPLIER,
          name: { equals: name, mode: 'insensitive' },
        }),
      })

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'DUPLICATE', message: 'A supplier with this name already exists' },
          },
          { status: 409 }
        )
      }
    }

    const supplier = await prisma.party.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(pointOfContact !== undefined && { pointOfContact }),
        ...(email !== undefined && { email }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(capacity !== undefined && { capacity }),
        ...(capacityType !== undefined && { capacityType }),
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.SUPPLIER_UPDATED,
      entityType: 'Party',
      entityId: supplier.id,
      metadata: { before: existing, after: supplier, partyRole: 'SUPPLIER' },
    })

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('Update supplier error:', error)
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
    const existing = await prisma.party.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    // Verify ownership and party role
    verifyOrgOwnership(session, existing)
    if (existing.partyRole !== PartyRole.SUPPLIER) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 }
      )
    }

    // Hard delete - completely remove the record
    await prisma.party.delete({
      where: { id },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.SUPPLIER_DELETED,
      entityType: 'Party',
      entityId: id,
      metadata: { name: existing.name, partyRole: 'SUPPLIER' },
    })

    return NextResponse.json({ success: true, data: { message: 'Supplier deleted successfully' } })
  } catch (error) {
    console.error('Delete supplier error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
