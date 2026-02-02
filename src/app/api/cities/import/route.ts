import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { orgScopedData, orgScopedWhere } from '@/lib/org-scoped'
import { LocationType } from '@prisma/client'

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
    const { cities } = body as { cities: { name: string; code?: string; region?: string }[] }

    if (!Array.isArray(cities) || cities.length === 0) {
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

    for (const [index, cityData] of cities.entries()) {
      try {
        const name = cityData.name?.trim()
        const code = cityData.code?.trim() || null
        const region = cityData.region?.trim() || null

        if (!name) {
          results.errors.push(`Row ${index + 1}: Name is required`)
          results.skipped++
          continue
        }

        const existing = await prisma.location.findFirst({
          where: orgScopedWhere(session, {
            locationType: LocationType.CITY,
            OR: [
              { name: { equals: name, mode: 'insensitive' } },
              ...(code ? [{ code: { equals: code, mode: 'insensitive' } }] : []),
            ],
          }),
        })

        if (existing) {
          results.errors.push(`Row ${index + 1}: City "${name}" already exists`)
          results.skipped++
          continue
        }

        await prisma.location.create({
          data: orgScopedData(session, {
            name,
            code,
            region,
            locationType: LocationType.CITY,
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
      action: AuditAction.CITY_CREATED,
      entityType: 'Location',
      entityId: 'bulk-import',
      metadata: {
        bulkImport: true,
        created: results.created,
        skipped: results.skipped,
        locationType: 'CITY'
      },
    })

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('City import error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
