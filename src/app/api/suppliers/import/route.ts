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
    const { suppliers } = body as { suppliers: { name: string; pointOfContact?: string; email?: string; phoneNumber?: string }[] }

    if (!Array.isArray(suppliers) || suppliers.length === 0) {
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

    for (const [index, supplierData] of suppliers.entries()) {
      try {
        const name = supplierData.name?.trim()
        const pointOfContact = supplierData.pointOfContact?.trim() || null
        const email = supplierData.email?.trim() || null
        const phoneNumber = supplierData.phoneNumber?.trim() || null

        if (!name) {
          results.errors.push(`Row ${index + 1}: Name is required`)
          results.skipped++
          continue
        }

        const existing = await prisma.party.findFirst({
          where: orgScopedWhere(session, {
            partyRole: PartyRole.SUPPLIER,
            name: { equals: name, mode: 'insensitive' },
          }),
        })

        if (existing) {
          results.errors.push(`Row ${index + 1}: Supplier "${name}" already exists`)
          results.skipped++
          continue
        }

        await prisma.party.create({
          data: orgScopedData(session, {
            name,
            uniqueIdentifier: generateUniqueIdentifier(PartyRole.SUPPLIER),
            pointOfContact,
            email,
            phoneNumber,
            partyRole: PartyRole.SUPPLIER,
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

    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.SUPPLIER_CREATED,
      entityType: 'Party',
      entityId: 'bulk-import',
      metadata: {
        bulkImport: true,
        created: results.created,
        skipped: results.skipped,
        partyRole: 'SUPPLIER'
      },
    })

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Supplier import error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
