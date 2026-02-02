import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { orgScopedData, orgScopedWhere } from '@/lib/org-scoped'
import { PartyRole } from '@prisma/client'
import { generateUniqueIdentifier } from '@/lib/generate-id'

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
    const { clients } = body as { clients: { name: string; pointOfContact?: string; phoneNumber?: string }[] }

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid data format' } },
        { status: 400 }
      )
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Process each client
    for (const [index, clientData] of clients.entries()) {
      try {
        const name = clientData.name?.trim()
        const pointOfContact = clientData.pointOfContact?.trim() || null
        const phoneNumber = clientData.phoneNumber?.trim() || null

        if (!name) {
          results.errors.push(`Row ${index + 1}: Name is required`)
          results.skipped++
          continue
        }

        // Check if client already exists
        const existing = await prisma.party.findFirst({
          where: orgScopedWhere(session, {
            partyRole: PartyRole.CUSTOMER,
            name: { equals: name, mode: 'insensitive' },
          }),
        })

        if (existing) {
          results.errors.push(`Row ${index + 1}: Client "${name}" already exists`)
          results.skipped++
          continue
        }

        // Create client
        await prisma.party.create({
          data: orgScopedData(session, {
            name,
            uniqueIdentifier: generateUniqueIdentifier(PartyRole.CUSTOMER),
            pointOfContact,
            phoneNumber,
            partyRole: PartyRole.CUSTOMER,
            isActive: true,
          }),
        })

        results.created++
      } catch (error) {
        results.errors.push(
          `Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        results.skipped++
      }
    }

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CLIENT_CREATED,
      entityType: 'Party',
      entityId: 'bulk-import',
      metadata: {
        bulkImport: true,
        created: results.created,
        skipped: results.skipped,
        partyRole: 'CUSTOMER'
      },
    })

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Client import error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
