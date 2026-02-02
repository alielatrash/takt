import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { createSession, setSessionCookie } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { loginSchema } from '@/lib/validations/auth'
import { headers } from 'next/headers'
import { getPlatformAdmin } from '@/lib/platform-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = loginSchema.safeParse(body)
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

    const { email, password } = validationResult.data
    const normalizedEmail = email.toLowerCase()

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_INACTIVE',
            message: 'Your account has been deactivated',
          },
        },
        { status: 403 }
      )
    }

    // Check if user has organization memberships
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    })

    if (memberships.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'User is not a member of any organization. Please contact support.',
          },
        },
        { status: 403 }
      )
    }

    // Ensure user has currentOrgId set
    const currentOrgId = user.currentOrgId || memberships[0].organizationId
    if (!user.currentOrgId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { currentOrgId: memberships[0].organizationId },
      })
    }

    // Update lastActivityAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActivityAt: new Date() },
    })

    // Create session and set cookie
    const userAgent = request.headers.get('user-agent') || undefined
    const token = await createSession(user.id, userAgent)
    await setSessionCookie(token)

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.USER_LOGGED_IN,
      entityType: 'User',
      entityId: user.id,
      metadata: { email: normalizedEmail },
    })

    // Activity log for platform admin visibility
    const headersList = await headers()
    await prisma.activityEvent.create({
      data: {
        organizationId: currentOrgId,
        actorUserId: user.id,
        actorEmail: user.email,
        eventType: 'user.login',
        ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null,
        userAgent: userAgent || null,
      },
    }).catch(() => {
      // Don't fail login if activity logging fails
      console.error('Failed to log activity event')
    })

    // Check if user is platform admin
    const platformAdmin = await getPlatformAdmin(user.id)
    const isPlatformAdmin = !!platformAdmin

    return NextResponse.json({
      success: true,
      data: {
        message: 'Login successful',
        isPlatformAdmin,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
