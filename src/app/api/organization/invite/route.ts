import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { extractDomain } from '@/lib/domain'
import { z } from 'zod'

// Validation schema for invitation
const inviteSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
  functionalRole: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER', 'ADMIN']).default('DEMAND_PLANNER'),
})

// POST /api/organization/invite - Invite user to organization (OWNER/ADMIN only)
export async function POST(request: Request) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Only owners and admins can invite members' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = inviteSchema.safeParse(body)

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

    const { email, role, functionalRole } = validationResult.data

    // Admins cannot invite as OWNER
    if (session.user.currentOrgRole === 'ADMIN' && role === 'ADMIN') {
      // Note: role can only be 'ADMIN' or 'MEMBER' from validation, but keeping this check
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admins cannot invite other admins' } },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Check if user is already a member of this organization
      const existingMembership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: session.user.currentOrgId,
            userId: existingUser.id,
          },
        },
      })

      if (existingMembership) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ALREADY_MEMBER',
              message: 'This user is already a member of your organization',
            },
          },
          { status: 409 }
        )
      }

      // User exists but not a member - add them directly
      const membership = await prisma.organizationMember.create({
        data: {
          organizationId: session.user.currentOrgId,
          userId: existingUser.id,
          role,
          functionalRole,
          invitedBy: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      })

      // If user has no currentOrgId, set it to this organization
      if (!existingUser.currentOrgId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { currentOrgId: session.user.currentOrgId },
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          message: `${existingUser.firstName} ${existingUser.lastName} has been added to your organization`,
          membership,
        },
      })
    }

    // User doesn't exist - they need to register
    // Check if their email domain matches an organization domain
    const emailDomain = extractDomain(email)
    const domainClaim = await prisma.organizationDomain.findUnique({
      where: { domain: emailDomain },
      include: { organization: true },
    })

    if (domainClaim && domainClaim.organizationId !== session.user.currentOrgId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DOMAIN_CLAIMED',
            message: `This email domain is claimed by ${domainClaim.organization.name}. The user will auto-join that organization when they register.`,
          },
        },
        { status: 409 }
      )
    }

    // For MVP, we'll return a message that the user needs to register
    // In the future, this would create an invitation token and send an email
    return NextResponse.json({
      success: true,
      data: {
        message: `Invitation would be sent to ${email}. For MVP, ask them to register with this email.`,
        note: 'Full invitation system with email tokens will be implemented in a future release',
      },
    })
  } catch (error) {
    console.error('Invite organization member error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
