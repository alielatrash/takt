import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET: Fetch user's managed clients
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Get managed client IDs
    const managedClientRelations = await prisma.userManagedClient.findMany({
      where: { userId: session.user.id },
      select: { partyId: true },
    })

    const managedClientIds = managedClientRelations.map((r) => r.partyId)

    // Fetch full client details
    const clients = await prisma.party.findMany({
      where: {
        id: { in: managedClientIds },
        partyRole: 'CUSTOMER',
        organizationId: session.user.currentOrgId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        pointOfContact: true,
        phoneNumber: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: clients,
    })
  } catch (error) {
    console.error('Get managed clients error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch managed clients' } },
      { status: 500 }
    )
  }
}

// POST: Update user's managed clients
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
    const { clientIds } = body

    if (!Array.isArray(clientIds)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'clientIds must be an array' } },
        { status: 400 }
      )
    }

    // Delete existing managed clients
    await prisma.userManagedClient.deleteMany({
      where: { userId: session.user.id },
    })

    // Create new managed client associations
    if (clientIds.length > 0) {
      await prisma.userManagedClient.createMany({
        data: clientIds.map((clientId: string) => ({
          userId: session.user.id,
          partyId: clientId,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Managed clients updated successfully' },
    })
  } catch (error) {
    console.error('Update managed clients error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update managed clients' } },
      { status: 500 }
    )
  }
}
