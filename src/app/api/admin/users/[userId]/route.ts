import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

type RouteParams = { params: Promise<{ userId: string }> }

// Delete a user (admin only)
export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { userId } = await params

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' } },
        { status: 403 }
      )
    }

    // Check if user exists and belongs to current organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: session.user.currentOrgId,
          userId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found in current organization' } },
        { status: 404 }
      )
    }

    // Delete user (cascade delete will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ success: true, data: { message: 'User deleted successfully' } })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' } },
      { status: 500 }
    )
  }
}
