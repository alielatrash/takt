import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { orgScopedData, orgScopedWhere } from '@/lib/org-scoped'

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
    const { truckTypes } = body as { truckTypes: { name: string }[] }

    if (!Array.isArray(truckTypes) || truckTypes.length === 0) {
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

    for (const [index, truckTypeData] of truckTypes.entries()) {
      try {
        const name = truckTypeData.name?.trim()

        if (!name) {
          results.errors.push(`Row ${index + 1}: Name is required`)
          results.skipped++
          continue
        }

        const existing = await prisma.resourceType.findFirst({
          where: orgScopedWhere(session, {
            name: { equals: name, mode: 'insensitive' },
          }),
        })

        if (existing) {
          results.errors.push(`Row ${index + 1}: Truck type "${name}" already exists`)
          results.skipped++
          continue
        }

        await prisma.resourceType.create({
          data: orgScopedData(session, {
            name,
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
      action: AuditAction.TRUCK_TYPE_CREATED,
      entityType: 'ResourceType',
      entityId: 'bulk-import',
      metadata: {
        bulkImport: true,
        created: results.created,
        skipped: results.skipped,
      },
    })

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Truck type import error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
