import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

// Validation schema for member role update
const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).optional(),
  functionalRole: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER', 'ADMIN']).optional(),
})

// DELETE /api/organization/members/[id] - Remove member (OWNER/ADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Check if user is OWNER or ADMIN
    if (session.user.currentOrgRole !== 'OWNER' && session.user.currentOrgRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only owners and admins can remove members' } },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if membership exists and belongs to the current organization
    const membership = await prisma.organizationMember.findUnique({
      where: { id },
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } },
        { status: 404 }
      )
    }

    if (membership.organizationId !== session.user.currentOrgId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot remove member from another organization' } },
        { status: 403 }
      )
    }

    // Cannot remove yourself
    if (membership.userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'CANNOT_REMOVE_SELF', message: 'Cannot remove yourself from the organization' } },
        { status: 400 }
      )
    }

    // Admins cannot remove owners
    if (session.user.currentOrgRole === 'ADMIN' && membership.role === 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admins cannot remove owners' } },
        { status: 403 }
      )
    }

    // Delete membership
    await prisma.organizationMember.delete({
      where: { id },
    })

    // If user has no other organizations, their currentOrgId should be cleared
    const otherMemberships = await prisma.organizationMember.findMany({
      where: { userId: membership.userId },
    })

    if (otherMemberships.length === 0) {
      await prisma.user.update({
        where: { id: membership.userId },
        data: { currentOrgId: null },
      })
    } else if (otherMemberships[0].organizationId !== membership.organizationId) {
      // If their current org was this one, switch to another org
      const userCurrentOrg = await prisma.user.findUnique({
        where: { id: membership.userId },
        select: { currentOrgId: true },
      })

      if (userCurrentOrg?.currentOrgId === membership.organizationId) {
        await prisma.user.update({
          where: { id: membership.userId },
          data: { currentOrgId: otherMemberships[0].organizationId },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Member removed successfully' },
    })
  } catch (error) {
    console.error('Remove organization member error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// PATCH /api/organization/members/[id] - Update member role (OWNER only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Only OWNER can change roles
    if (session.user.currentOrgRole !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only organization owners can change member roles' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = updateMemberSchema.safeParse(body)

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

    const { role, functionalRole } = validationResult.data

    // Check if membership exists and belongs to the current organization
    const membership = await prisma.organizationMember.findUnique({
      where: { id },
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } },
        { status: 404 }
      )
    }

    if (membership.organizationId !== session.user.currentOrgId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot update member from another organization' } },
        { status: 403 }
      )
    }

    // Cannot change your own role
    if (membership.userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'CANNOT_CHANGE_OWN_ROLE', message: 'Cannot change your own role' } },
        { status: 400 }
      )
    }

    // Update membership
    const updatedMembership = await prisma.organizationMember.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(functionalRole && { functionalRole }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedMembership,
    })
  } catch (error) {
    console.error('Update organization member error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
