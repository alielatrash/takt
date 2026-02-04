import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  mobileNumber: z.string().optional(),
})

// GET: Verify invitation token and get details
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Token is required' } },
        { status: 400 }
      )
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid invitation token' } },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'ALREADY_ACCEPTED', message: 'This invitation has already been accepted' },
        },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { success: false, error: { code: 'EXPIRED', message: 'This invitation has expired' } },
        { status: 400 }
      )
    }

    // Fetch organization separately
    const organization = await prisma.organization.findUnique({
      where: { id: invitation.organizationId },
      select: { id: true, name: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        email: invitation.email,
        organizationName: organization?.name,
        role: invitation.functionalRole,
      },
    })
  } catch (error) {
    console.error('Verify invitation error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify invitation' } },
      { status: 500 }
    )
  }
}

// POST: Accept invitation and create user account
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validationResult = acceptInvitationSchema.safeParse(body)

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

    const { token, firstName, lastName, password, mobileNumber } = validationResult.data

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid invitation token' } },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'ALREADY_ACCEPTED', message: 'This invitation has already been accepted' },
        },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { success: false, error: { code: 'EXPIRED', message: 'This invitation has expired' } },
        { status: 400 }
      )
    }

    // Fetch organization for success message
    const organization = await prisma.organization.findUnique({
      where: { id: invitation.organizationId },
      select: { name: true },
    })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    })

    let userId: string

    if (existingUser) {
      // User exists, check if they're already a member
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: existingUser.id,
          },
        },
      })

      if (existingMember) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'ALREADY_MEMBER', message: 'You are already a member of this organization' },
          },
          { status: 400 }
        )
      }

      userId = existingUser.id
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(password, 10)

      const newUser = await prisma.user.create({
        data: {
          email: invitation.email,
          firstName,
          lastName,
          mobileNumber: mobileNumber || null,
          role: invitation.functionalRole,
          passwordHash,
          emailVerified: true, // Email is verified since they clicked the invitation link
          isActive: true,
          currentOrgId: invitation.organizationId,
        },
      })

      userId = newUser.id
    }

    // Create organization membership
    await prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        functionalRole: invitation.functionalRole,
        invitedBy: invitation.invitedBy,
      },
    })

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          message: `Successfully joined ${organization?.name}`,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to accept invitation' } },
      { status: 500 }
    )
  }
}
