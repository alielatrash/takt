import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { resolveTxt } from 'dns/promises'
import { createAuditLog, AuditAction } from '@/lib/audit'

// POST /api/organization/domains/[id]/verify - Verify domain ownership via DNS TXT record
export async function POST(
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

    const { id: domainId } = await params

    // Get domain
    const domain = await prisma.organizationDomain.findUnique({
      where: { id: domainId },
      include: { organization: true },
    })

    if (!domain) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Domain not found' } },
        { status: 404 }
      )
    }

    // Check if user is OWNER of the organization
    if (domain.organizationId !== session.user.currentOrgId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    if (session.user.currentOrgRole !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only organization owners can verify domains' } },
        { status: 403 }
      )
    }

    // Check if already verified
    if (domain.isVerified) {
      return NextResponse.json({
        success: true,
        data: domain,
        message: 'Domain is already verified',
      })
    }

    // Check if verification token exists
    if (!domain.verificationToken) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_TOKEN', message: 'No verification token found' } },
        { status: 400 }
      )
    }

    // Look up DNS TXT records
    try {
      const txtRecords = await resolveTxt(domain.domain)
      const expectedRecord = `takt-verification=${domain.verificationToken}`

      // Check if any TXT record matches our verification token
      const isVerified = txtRecords.some((records) => {
        // Each TXT record can be an array of strings (for long records split across multiple strings)
        const record = Array.isArray(records) ? records.join('') : records
        return record === expectedRecord
      })

      if (!isVerified) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VERIFICATION_FAILED',
              message: 'Verification failed. TXT record not found or incorrect.',
              details: {
                expected: expectedRecord,
                found: txtRecords.flat(),
              },
            },
          },
          { status: 400 }
        )
      }

      // Mark domain as verified
      const verifiedDomain = await prisma.organizationDomain.update({
        where: { id: domainId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      })

      // Audit log
      await createAuditLog({
        userId: session.user.id,
        action: AuditAction.DOMAIN_ADDED,
        entityType: 'OrganizationDomain',
        entityId: domainId,
        metadata: {
          domain: domain.domain,
          organizationId: domain.organizationId,
          verified: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: verifiedDomain,
        message: 'Domain verified successfully!',
      })
    } catch (dnsError: any) {
      // DNS lookup failed
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DNS_LOOKUP_FAILED',
            message: 'Could not resolve DNS records for this domain. Please ensure the domain is correctly configured.',
            details: dnsError.message,
          },
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Verify domain error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
