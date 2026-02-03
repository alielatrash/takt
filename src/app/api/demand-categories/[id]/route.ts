import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { updateDemandCategorySchema } from '@/lib/validations/repositories'
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
    const category = await prisma.demandCategory.findUnique({ where: { id } })

    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, category)

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    console.error('Get demand category error:', error)
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
    const validationResult = updateDemandCategorySchema.safeParse(body)

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

    const existing = await prisma.demandCategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    const { name, code } = validationResult.data

    // Check for duplicates within organization (excluding current record)
    if (name || code) {
      const duplicate = await prisma.demandCategory.findFirst({
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
            error: { code: 'DUPLICATE', message: 'A category with this name or code already exists' },
          },
          { status: 409 }
        )
      }
    }

    const category = await prisma.demandCategory.update({
      where: { id },
      data: validationResult.data,
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DEMAND_CATEGORY_UPDATED,
      entityType: 'DemandCategory',
      entityId: category.id,
      metadata: { before: existing, after: category },
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    console.error('Update demand category error:', error)
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
    const existing = await prisma.demandCategory.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 }
      )
    }

    // Verify ownership
    verifyOrgOwnership(session, existing)

    // Check for dependencies - prevent deletion if category is in use
    const forecastsUsingCategory = await prisma.demandForecast.count({
      where: { demandCategoryId: id },
    })

    if (forecastsUsingCategory > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'HAS_DEPENDENCIES',
            message: `Cannot delete category. It is currently used by ${forecastsUsingCategory} forecast(s). Deactivate the category instead or reassign the forecasts first.`,
          },
        },
        { status: 409 }
      )
    }

    // Hard delete if no dependencies
    await prisma.demandCategory.delete({
      where: { id },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.DEMAND_CATEGORY_DELETED,
      entityType: 'DemandCategory',
      entityId: id,
      metadata: { name: existing.name, code: existing.code },
    })

    return NextResponse.json({ success: true, data: { message: 'Category deleted successfully' } })
  } catch (error) {
    console.error('Delete demand category error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
