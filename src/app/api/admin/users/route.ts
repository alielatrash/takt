import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  mobileNumber: z.string().optional(),
  role: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER', 'ADMIN']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// Get all users (admin only, scoped to current organization)
export async function GET() {
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

    // Only show users from the current organization via OrganizationMember
    const memberships = await prisma.organizationMember.findMany({
      where: {
        organizationId: session.user.currentOrgId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    const users = memberships.map(m => ({
      ...m.user,
      orgRole: m.role,
      functionalRole: m.functionalRole,
    }))

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } },
      { status: 500 }
    )
  }
}

// Create a new user (admin only)
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
    const validationResult = createUserSchema.safeParse(body)

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

    const { email, firstName, lastName, mobileNumber, role, password } = validationResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'User with this email already exists' } },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user and add to current organization
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        mobileNumber: mobileNumber || null,
        role,
        passwordHash,
        isActive: true,
        currentOrgId: session.user.currentOrgId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    // Create organization membership
    await prisma.organizationMember.create({
      data: {
        organizationId: session.user.currentOrgId,
        userId: user.id,
        role: 'MEMBER',
        functionalRole: role,
      },
    })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } },
      { status: 500 }
    )
  }
}
