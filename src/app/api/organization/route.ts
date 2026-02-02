import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

// Validation schema for organization updates
const updateOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  country: z.string().optional(),
})

// GET /api/organization - Get current organization details
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.currentOrgId },
      include: {
        settings: true,
        domains: {
          orderBy: { isPrimary: 'desc' },
        },
        _count: {
          select: {
            members: true,
            parties: true,
            locations: true,
            resourceTypes: true,
            planningWeeks: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Organization not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: organization,
    })
  } catch (error) {
    console.error('Get organization error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// PATCH /api/organization - Update organization details (OWNER only)
export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Check if user is OWNER
    if (session.user.currentOrgRole !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only organization owners can update organization details' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateOrgSchema.safeParse(body)

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

    const { name, country } = validationResult.data

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: session.user.currentOrgId },
      data: {
        name,
        ...(country !== undefined && { country }),
      },
      include: {
        settings: true,
        domains: {
          orderBy: { isPrimary: 'desc' },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: organization,
    })
  } catch (error) {
    console.error('Update organization error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
