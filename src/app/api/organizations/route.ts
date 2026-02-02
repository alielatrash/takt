import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/organizations - List all organizations user belongs to
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    const organizations = memberships.map(m => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      isActive: m.organization.isActive,
      isCurrent: m.organizationId === session.user.currentOrgId,
      role: m.role,
      functionalRole: m.functionalRole,
      memberCount: m.organization._count.members,
      joinedAt: m.joinedAt,
    }))

    return NextResponse.json({
      success: true,
      data: organizations,
    })
  } catch (error) {
    console.error('Get organizations error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
