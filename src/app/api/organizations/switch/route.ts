import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { z } from 'zod'

// Validation schema for switching organization
const switchOrgSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
})

// POST /api/organizations/switch - Switch current organization
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
    const validationResult = switchOrgSchema.safeParse(body)

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

    const { organizationId } = validationResult.data

    // Verify user is a member of the target organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_MEMBER',
            message: 'You are not a member of this organization',
          },
        },
        { status: 403 }
      )
    }

    if (!membership.organization.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ORG_INACTIVE',
            message: 'This organization is not active',
          },
        },
        { status: 400 }
      )
    }

    // Update user's current organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: { currentOrgId: organizationId },
    })

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.ORGANIZATION_SWITCHED,
      entityType: 'Organization',
      entityId: organizationId,
      metadata: {
        fromOrg: session.user.currentOrgId,
        toOrg: organizationId,
        orgName: membership.organization.name,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        message: `Switched to ${membership.organization.name}`,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          role: membership.role,
          functionalRole: membership.functionalRole,
        },
      },
    })
  } catch (error) {
    console.error('Switch organization error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
