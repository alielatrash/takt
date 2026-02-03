import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

// Validation schema for updating organization settings
const updateSettingsSchema = z.object({
  locationLabel: z.string().min(1).max(50).optional(),
  locationLabelPlural: z.string().min(1).max(50).optional(),
  partyLabel: z.string().min(1).max(50).optional(),
  partyLabelPlural: z.string().min(1).max(50).optional(),
  resourceTypeLabel: z.string().min(1).max(50).optional(),
  resourceTypeLabelPlural: z.string().min(1).max(50).optional(),
  demandLabel: z.string().min(1).max(50).optional(),
  demandLabelPlural: z.string().min(1).max(50).optional(),
  supplyLabel: z.string().min(1).max(50).optional(),
  supplyLabelPlural: z.string().min(1).max(50).optional(),
  demandCategoryLabel: z.string().min(1).max(50).optional(),
  demandCategoryLabelPlural: z.string().min(1).max(50).optional(),
  demandCategoryEnabled: z.boolean().optional(),
  demandCategoryRequired: z.boolean().optional(),
})

// GET /api/organization/settings - Get organization settings
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Get or create organization settings
    let settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: session.user.currentOrgId },
    })

    // If settings don't exist, create them with defaults
    if (!settings) {
      settings = await prisma.organizationSettings.create({
        data: {
          organizationId: session.user.currentOrgId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Get organization settings error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// PATCH /api/organization/settings - Update organization settings (OWNER only)
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Only organization owners can update settings' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateSettingsSchema.safeParse(body)

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

    // Get or create settings
    let settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: session.user.currentOrgId },
    })

    if (!settings) {
      // Create with provided data
      settings = await prisma.organizationSettings.create({
        data: {
          organizationId: session.user.currentOrgId,
          ...validationResult.data,
        },
      })
    } else {
      // Update existing settings
      settings = await prisma.organizationSettings.update({
        where: { organizationId: session.user.currentOrgId },
        data: validationResult.data,
      })
    }

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    })
  } catch (error) {
    console.error('Update organization settings error:', error)
    // Include error details in development
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
        }
      },
      { status: 500 }
    )
  }
}
