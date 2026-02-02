import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { isPublicDomain, isAcceptableDomain } from '@/lib/domain'
import { z } from 'zod'
import { randomBytes } from 'crypto'

// Validation schema for adding domain
const addDomainSchema = z.object({
  domain: z.string().min(1, 'Domain is required').toLowerCase(),
})

// GET /api/organization/domains - List organization domains
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const domains = await prisma.organizationDomain.findMany({
      where: { organizationId: session.user.currentOrgId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: domains,
    })
  } catch (error) {
    console.error('Get organization domains error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// POST /api/organization/domains - Add new domain (OWNER only)
export async function POST(request: Request) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Only organization owners can add domains' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = addDomainSchema.safeParse(body)

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

    let { domain } = validationResult.data

    // Strip www. prefix if present
    if (domain.startsWith('www.')) {
      domain = domain.substring(4)
    }

    // Trim whitespace
    domain = domain.trim()

    console.log('[Add Domain] Processing domain:', domain)

    // Validate domain format (basic check)
    if (!domain.includes('.') || domain.length < 3) {
      console.log('[Add Domain] Failed basic validation')
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DOMAIN',
            message: 'Invalid domain format. Please enter a valid domain (e.g., example.com)',
          },
        },
        { status: 400 }
      )
    }

    // Check if domain is public
    if (isPublicDomain(domain)) {
      console.log('[Add Domain] Domain is public:', domain)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PUBLIC_DOMAIN',
            message: 'Cannot claim public email domains',
          },
        },
        { status: 400 }
      )
    }

    // Check if domain is acceptable
    if (!isAcceptableDomain(domain)) {
      console.log('[Add Domain] Domain not acceptable:', domain)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DOMAIN',
            message: 'Invalid domain format. Domain must contain only letters, numbers, hyphens, and dots.',
          },
        },
        { status: 400 }
      )
    }

    console.log('[Add Domain] Checking if domain already exists:', domain)

    // Check if domain is already claimed
    const existingDomain = await prisma.organizationDomain.findUnique({
      where: { domain },
      include: { organization: true },
    })

    console.log('[Add Domain] Existing domain check result:', existingDomain ? 'Found' : 'Not found')

    if (existingDomain) {
      const isOwnDomain = existingDomain.organizationId === session.user.currentOrgId

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DOMAIN_CLAIMED',
            message: isOwnDomain
              ? 'This domain is already claimed by your organization'
              : `This domain is already claimed by ${existingDomain.organization.name}`,
          },
        },
        { status: 409 }
      )
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex')

    console.log('[Add Domain] Creating domain with:', {
      organizationId: session.user.currentOrgId,
      domain,
      verificationToken: verificationToken.substring(0, 10) + '...'
    })

    // Add domain (not verified by default)
    const newDomain = await prisma.organizationDomain.create({
      data: {
        organizationId: session.user.currentOrgId,
        domain,
        isVerified: false, // Requires verification
        isPrimary: false,
        verificationToken,
      },
    })

    console.log('[Add Domain] Domain created successfully:', newDomain.id)

    return NextResponse.json({
      success: true,
      data: newDomain,
      message: `Domain added. Please add a TXT record to verify ownership.`,
    })
  } catch (error) {
    console.error('Add organization domain error:', error)

    // Check for specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any

      if (prismaError.code === 'P2002') {
        // Unique constraint violation
        const target = prismaError.meta?.target || []
        if (target.includes('domain')) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'DOMAIN_EXISTS',
              message: 'This domain is already registered to an organization'
            }
          }, { status: 409 })
        }
        if (target.includes('verificationToken')) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'TOKEN_COLLISION',
              message: 'Token collision occurred. Please try again.'
            }
          }, { status: 500 })
        }
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to add domain: ${errorMessage}`
        }
      },
      { status: 500 }
    )
  }
}
