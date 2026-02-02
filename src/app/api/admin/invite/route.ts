import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendInvitationEmail } from '@/lib/email'
import { z } from 'zod'
import crypto from 'crypto'

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER', 'ADMIN']),
})

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = inviteUserSchema.safeParse(body)

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

    const { email, role } = validationResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Check if they're already a member of this organization
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: session.user.currentOrgId,
            userId: existingUser.id,
          },
        },
      })

      if (existingMember) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'CONFLICT', message: 'User is already a member of this organization' },
          },
          { status: 409 }
        )
      }
    }

    // Check if there's already a pending invitation for this email to this organization
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId: session.user.currentOrgId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'An invitation has already been sent to this email address',
          },
        },
        { status: 409 }
      )
    }

    // Generate secure invitation token
    const token = crypto.randomBytes(32).toString('hex')

    // Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        organizationId: session.user.currentOrgId,
        role: 'MEMBER',
        functionalRole: role,
        invitedBy: session.user.id,
        expiresAt,
      },
    })

    // Get organization details for email
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.currentOrgId },
      select: { name: true },
    })

    // Build invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/invite/${token}`

    // Send invitation email
    await sendInvitationEmail({
      to: email,
      invitedByName: `${session.user.firstName} ${session.user.lastName}`,
      organizationName: organization?.name || 'the organization',
      invitationUrl,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Send invitation error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send invitation' } },
      { status: 500 }
    )
  }
}
