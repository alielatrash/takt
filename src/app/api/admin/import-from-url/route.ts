import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { orgScopedData } from '@/lib/org-scoped'
import { PartyRole, LocationType } from '@prisma/client'
import { generateUniqueIdentifier } from '@/lib/generate-id'
import Papa from 'papaparse'

interface CsvUrlImportRequest {
  csvUrl: string
  entityType: 'clients' | 'suppliers' | 'cities' | 'truck-types'
  columnMapping?: {
    name?: string
    region?: string
    pointOfContact?: string
    phoneNumber?: string
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  // Only admins can import from CSV URLs
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  const body = await request.json() as CsvUrlImportRequest
  const { csvUrl, entityType, columnMapping = {} } = body

  if (!csvUrl || !entityType) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'CSV URL and entity type are required' } },
      { status: 400 }
    )
  }

  // Create a streaming response for progress updates
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Helper to send progress updates
        const sendProgress = (current: number, total: number) => {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'progress', current, total }) + '\n')
          )
        }

        // Fetch CSV from URL
        const response = await fetch(csvUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.statusText}`)
        }

        const csvText = await response.text()

        // Parse CSV
        const parseResult = await new Promise<{ data: unknown[] }>((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve({ data: results.data as unknown[] }),
            error: (error: unknown) => reject(error),
          })
        })

        const results = {
          created: 0,
          skipped: 0,
          errors: [] as string[],
        }

        const totalRecords = parseResult.data.length

        // Log CSV structure for debugging
        if (totalRecords > 0) {
          const firstRow = parseResult.data[0] as Record<string, unknown>
          console.log('[CSV Import] First row columns:', Object.keys(firstRow))
        }

        // Import based on entity type with progress updates
        for (const [index, rowData] of parseResult.data.entries()) {
          // Send progress update every 10 records or on first/last record
          if (index === 0 || index === totalRecords - 1 || index % 10 === 0) {
            sendProgress(index + 1, totalRecords)
          }

          try {
            const row = rowData as Record<string, unknown>

        // Try to find name in various possible column names
        const possibleNameColumns = [
          columnMapping.name,
          'name',
          'Name',
          'entity',  // Redash query column name
          'shipper_name',
          'supplier_name',
          'partner_entity_name',
          'partner_name',
          'city_name',
          'truck_type'
        ].filter(Boolean)

        let name: string | null = null
        for (const col of possibleNameColumns) {
          if (row[col!] && String(row[col!]).trim() !== '') {
            name = String(row[col!]).trim()
            break
          }
        }

        if (!name) {
          const availableColumns = Object.keys(row).slice(0, 5).join(', ')
          results.errors.push(`Row ${index + 1}: Name column not found. Available columns: ${availableColumns}`)
          results.skipped++
          continue
        }

        const trimmedName = name

        // Try to find region in various possible column names
        const possibleRegionColumns = [columnMapping.region, 'region', 'Region'].filter(Boolean)
        let region: string | null = null
        for (const col of possibleRegionColumns) {
          if (row[col!]) {
            region = String(row[col!]).trim()
            break
          }
        }

        // Try to find point of contact
        const possiblePocColumns = [columnMapping.pointOfContact, 'pointOfContact', 'point_of_contact', 'partner_name'].filter(Boolean)
        let pointOfContact: string | null = null
        for (const col of possiblePocColumns) {
          if (row[col!]) {
            pointOfContact = String(row[col!]).trim()
            break
          }
        }

        // Try to find phone number
        const possiblePhoneColumns = [columnMapping.phoneNumber, 'phoneNumber', 'phone_number', 'mobile_number'].filter(Boolean)
        let phoneNumber: string | null = null
        for (const col of possiblePhoneColumns) {
          if (row[col!]) {
            phoneNumber = String(row[col!]).trim()
            break
          }
        }

        switch (entityType) {
          case 'clients': {
            const existing = await prisma.party.findFirst({
              where: {
                organizationId: session.user.currentOrgId,
                partyRole: PartyRole.CUSTOMER,
                name: { equals: trimmedName, mode: 'insensitive' },
              },
            })

            if (existing) {
              results.skipped++
              continue
            }

            await prisma.party.create({
              data: orgScopedData(session, {
                name: trimmedName,
                uniqueIdentifier: generateUniqueIdentifier(PartyRole.CUSTOMER),
                pointOfContact,
                phoneNumber,
                partyRole: PartyRole.CUSTOMER,
                isActive: true,
              }),
            })
            results.created++
            break
          }

          case 'suppliers': {
            const existing = await prisma.party.findFirst({
              where: {
                organizationId: session.user.currentOrgId,
                partyRole: PartyRole.SUPPLIER,
                name: { equals: trimmedName, mode: 'insensitive' },
              },
            })

            if (existing) {
              results.skipped++
              continue
            }

            await prisma.party.create({
              data: orgScopedData(session, {
                name: trimmedName,
                uniqueIdentifier: generateUniqueIdentifier(PartyRole.SUPPLIER),
                pointOfContact,
                phoneNumber,
                partyRole: PartyRole.SUPPLIER,
                isActive: true,
              }),
            })
            results.created++
            break
          }

          case 'cities': {
            const existing = await prisma.location.findFirst({
              where: {
                organizationId: session.user.currentOrgId,
                locationType: LocationType.CITY,
                name: { equals: trimmedName, mode: 'insensitive' },
              },
            })

            if (existing) {
              results.skipped++
              continue
            }

            await prisma.location.create({
              data: orgScopedData(session, {
                name: trimmedName,
                region,
                locationType: LocationType.CITY,
                isActive: true,
              }),
            })
            results.created++
            break
          }

          case 'truck-types': {
            const existing = await prisma.resourceType.findFirst({
              where: {
                organizationId: session.user.currentOrgId,
                name: { equals: trimmedName, mode: 'insensitive' },
              },
            })

            if (existing) {
              results.skipped++
              continue
            }

            await prisma.resourceType.create({
              data: orgScopedData(session, {
                name: trimmedName,
                isActive: true,
              }),
            })
            results.created++
            break
          }
        }
          } catch (error: unknown) {
            results.errors.push(
              `Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            results.skipped++
          }
        }

        // Send final progress
        sendProgress(totalRecords, totalRecords)

        // Create audit log
        await createAuditLog({
          userId: session.user.id,
          action: AuditAction.CLIENT_CREATED, // Generic action
          entityType: 'Import',
          entityId: 'csv-url-import',
          metadata: {
            csvUrl,
            entityType,
            created: results.created,
            skipped: results.skipped,
          },
        })

        // Send final result
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'complete', data: results }) + '\n')
        )
        controller.close()
      } catch (error: unknown) {
        console.error('CSV URL import error:', error)
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'An unexpected error occurred',
            }) + '\n'
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
