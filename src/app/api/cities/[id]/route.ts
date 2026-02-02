import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { updateCitySchema } from '@/lib/validations/repositories'
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
    const city = await prisma.location.findUnique({ where: { id } })

    if (!city) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'City not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, city)

    return NextResponse.json({ success: true, data: city })
  } catch (error) {
    console.error('Get city error:', error)
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
    const validationResult = updateCitySchema.safeParse(body)

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

    const existing = await prisma.location.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'City not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    const { name, code } = validationResult.data

    // Check for duplicates within organization (excluding current record)
    if (name || code) {
      const duplicate = await prisma.location.findFirst({
        where: orgScopedWhere(session, {
          id: { not: id },
          OR: [
            ...(name ? [{ name: { equals: name, mode: 'insensitive' as const } }] : []),
            ...(code ? [{ code: { equals: code, mode: 'insensitive' as const } }] : []),
          ],
        }),
      })

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'DUPLICATE', message: 'A city with this name or code already exists' },
          },
          { status: 409 }
        )
      }
    }

    const city = await prisma.location.update({
      where: { id },
      data: validationResult.data,
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CITY_UPDATED,
      entityType: 'Location',
      entityId: city.id,
      metadata: { before: existing, after: city },
    })

    return NextResponse.json({ success: true, data: city })
  } catch (error) {
    console.error('Update city error:', error)
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
    const existing = await prisma.location.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'City not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    // Soft delete by setting isActive to false
    const city = await prisma.location.update({
      where: { id },
      data: { isActive: false },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CITY_DELETED,
      entityType: 'Location',
      entityId: city.id,
      metadata: { name: existing.name },
    })

    return NextResponse.json({ success: true, data: { message: 'City deactivated' } })
  } catch (error) {
    console.error('Delete city error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
