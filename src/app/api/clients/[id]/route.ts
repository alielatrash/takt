import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { updateClientSchema } from '@/lib/validations/repositories'
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
    const client = await prisma.party.findUnique({ where: { id } })

    if (!client) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } },
        { status: 404 }
      )
    }

    // Verify ownership and party role
    verifyOrgOwnership(session, client)
    if (client.partyRole !== PartyRole.CUSTOMER) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error('Get client error:', error)
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
    const validationResult = updateClientSchema.safeParse(body)

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
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } },
        { status: 404 }
      )
    }

    // Verify ownership and party role
    verifyOrgOwnership(session, existing)
    if (existing.partyRole !== PartyRole.CUSTOMER) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } },
        { status: 404 }
      )
    }

    const { name, pointOfContact, phoneNumber } = validationResult.data

    // Check for duplicates within organization (excluding current record)
    if (name) {
      const duplicate = await prisma.party.findFirst({
        where: orgScopedWhere(session, {
          id: { not: id },
          partyRole: PartyRole.CUSTOMER,
          name: { equals: name, mode: 'insensitive' },
        }),
      })

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'DUPLICATE', message: 'A client with this name already exists' },
          },
          { status: 409 }
        )
      }
    }

    const client = await prisma.party.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(pointOfContact !== undefined && { pointOfContact }),
        ...(phoneNumber !== undefined && { phoneNumber }),
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CLIENT_UPDATED,
      entityType: 'Party',
      entityId: client.id,
      metadata: { before: existing, after: client, partyRole: 'CUSTOMER' },
    })

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error('Update client error:', error)
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
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } },
        { status: 404 }
      )
    }

    // Verify ownership and party role
    verifyOrgOwnership(session, existing)
    if (existing.partyRole !== PartyRole.CUSTOMER) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    const client = await prisma.party.update({
      where: { id },
      data: { isActive: false },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CLIENT_DELETED,
      entityType: 'Party',
      entityId: client.id,
      metadata: { name: existing.name, partyRole: 'CUSTOMER' },
    })

    return NextResponse.json({ success: true, data: { message: 'Client deactivated' } })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
