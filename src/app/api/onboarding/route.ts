import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const onboardingSchema = z.object({
  role: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER']),
  managedClientIds: z.array(z.string()).optional(),
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

    const body = await request.json()
    const validationResult = onboardingSchema.safeParse(body)

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

    const { role, managedClientIds = [] } = validationResult.data

    // Update user's role and mark onboarding as completed
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role,
        onboardingCompleted: true,
      },
    })

    // Update organization membership with the new functional role
    await prisma.organizationMember.updateMany({
      where: {
        userId: session.user.id,
        organizationId: session.user.currentOrgId,
      },
      data: {
        functionalRole: role,
      },
    })

    // If demand planner, save managed clients
    if (role === 'DEMAND_PLANNER' && managedClientIds.length > 0) {
      // Delete existing managed clients first
      await prisma.userManagedClient.deleteMany({
        where: { userId: session.user.id },
      })

      // Create new managed client associations
      await prisma.userManagedClient.createMany({
        data: managedClientIds.map((clientId) => ({
          userId: session.user.id,
          partyId: clientId,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Onboarding completed successfully' },
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to complete onboarding' } },
      { status: 500 }
    )
  }
}
