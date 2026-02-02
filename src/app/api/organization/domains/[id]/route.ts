import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// DELETE /api/organization/domains/[id] - Remove domain (OWNER only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Only organization owners can remove domains' } },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if domain exists and belongs to the current organization
    const domain = await prisma.organizationDomain.findUnique({
      where: { id },
    })

    if (!domain) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Domain not found' } },
        { status: 404 }
      )
    }

    if (domain.organizationId !== session.user.currentOrgId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot remove domain from another organization' } },
        { status: 403 }
      )
    }

    // Check if this is a verified primary domain
    // Unverified domains can always be deleted, even if marked as primary
    if (domain.isPrimary && domain.isVerified) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANNOT_DELETE_PRIMARY',
            message: 'Cannot remove verified primary domain. Set another domain as primary first.',
          },
        },
        { status: 400 }
      )
    }

    // Delete domain
    await prisma.organizationDomain.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Domain removed successfully' },
    })
  } catch (error) {
    console.error('Remove organization domain error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// PATCH /api/organization/domains/[id] - Update domain (set as primary, verify)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Only organization owners can update domains' } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { isPrimary, isVerified } = body

    // Check if domain exists and belongs to the current organization
    const domain = await prisma.organizationDomain.findUnique({
      where: { id },
    })

    if (!domain) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Domain not found' } },
        { status: 404 }
      )
    }

    if (domain.organizationId !== session.user.currentOrgId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot update domain from another organization' } },
        { status: 403 }
      )
    }

    // If setting as primary, unset other primary domains
    if (isPrimary === true) {
      await prisma.organizationDomain.updateMany({
        where: {
          organizationId: session.user.currentOrgId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      })
    }

    // Update domain
    const updatedDomain = await prisma.organizationDomain.update({
      where: { id },
      data: {
        ...(typeof isPrimary === 'boolean' && { isPrimary }),
        ...(typeof isVerified === 'boolean' && { isVerified }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedDomain,
    })
  } catch (error) {
    console.error('Update organization domain error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
