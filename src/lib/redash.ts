import { parse } from 'csv-parse/sync'
import { prisma } from '@/lib/prisma'
import { generateCitym } from '@/lib/citym'

interface RedashConfig {
  baseUrl: string
  actualRequestsQueryId: string
  actualRequestsApiKey: string
  completionQueryId: string
  completionApiKey: string
  suppliersQueryId: string
  suppliersApiKey: string
}

function getConfig(): RedashConfig {
  return {
    baseUrl: process.env.REDASH_BASE_URL || 'https://redash.trella.co',
    actualRequestsQueryId: process.env.REDASH_ACTUAL_REQUESTS_QUERY_ID || '',
    actualRequestsApiKey: process.env.REDASH_ACTUAL_REQUESTS_API_KEY || '',
    completionQueryId: process.env.REDASH_COMPLETION_QUERY_ID || '',
    completionApiKey: process.env.REDASH_COMPLETION_API_KEY || '',
    suppliersQueryId: process.env.REDASH_SUPPLIERS_QUERY_ID || '',
    suppliersApiKey: process.env.REDASH_SUPPLIERS_API_KEY || '',
  }
}

async function fetchCsv(queryId: string, apiKey: string): Promise<string> {
  const config = getConfig()
  const url = `${config.baseUrl}/api/queries/${queryId}/results.csv?api_key=${apiKey}`

  const response = await fetch(url, {
    headers: { 'Accept': 'text/csv' },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`Redash fetch failed: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

export async function syncActualRequests(): Promise<number> {
  const config = getConfig()

  if (!config.actualRequestsQueryId || !config.actualRequestsApiKey) {
    console.log('Skipping actual requests sync - missing config')
    return 0
  }

  await prisma.redashSync.upsert({
    where: { endpoint: 'ACTUAL_SHIPPER_REQUESTS' },
    create: { endpoint: 'ACTUAL_SHIPPER_REQUESTS', lastSyncStatus: 'IN_PROGRESS' },
    update: { lastSyncStatus: 'IN_PROGRESS', errorMessage: null },
  })

  try {
    const csv = await fetchCsv(config.actualRequestsQueryId, config.actualRequestsApiKey)
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]

    let count = 0
    for (const record of records) {
      const externalId = record.id || record.request_id || `${record.shipper_name}-${record.request_date}-${count}`
      const pickupCity = record.pickup_city || record.pu_city || ''
      const dropoffCity = record.dropoff_city || record.do_city || ''

      if (!pickupCity || !dropoffCity) continue

      const citym = generateCitym(pickupCity, dropoffCity)

      await prisma.actualShipperRequest.upsert({
        where: { externalId },
        create: {
          externalId,
          shipperName: record.shipper_name || record.shipper || null,
          citym,
          requestDate: new Date(record.request_date || record.date),
          truckType: record.truck_type || null,
          loadsRequested: parseInt(record.loads_requested || record.loads || '0', 10),
          loadsFulfilled: parseInt(record.loads_fulfilled || '0', 10),
        },
        update: {
          loadsFulfilled: parseInt(record.loads_fulfilled || '0', 10),
          syncedAt: new Date(),
        },
      })
      count++
    }

    await prisma.redashSync.update({
      where: { endpoint: 'ACTUAL_SHIPPER_REQUESTS' },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
        recordsCount: count,
        errorMessage: null,
      },
    })

    return count
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.redashSync.update({
      where: { endpoint: 'ACTUAL_SHIPPER_REQUESTS' },
      data: { lastSyncStatus: 'FAILED', errorMessage },
    })

    throw error
  }
}

export async function syncFleetCompletions(): Promise<number> {
  const config = getConfig()

  if (!config.completionQueryId || !config.completionApiKey) {
    console.log('Skipping fleet completions sync - missing config')
    return 0
  }

  await prisma.redashSync.upsert({
    where: { endpoint: 'FLEET_PARTNER_COMPLETION' },
    create: { endpoint: 'FLEET_PARTNER_COMPLETION', lastSyncStatus: 'IN_PROGRESS' },
    update: { lastSyncStatus: 'IN_PROGRESS', errorMessage: null },
  })

  try {
    const csv = await fetchCsv(config.completionQueryId, config.completionApiKey)
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]

    let count = 0
    for (const record of records) {
      const externalId = record.id || record.completion_id || `${record.supplier_name}-${record.completion_date}-${count}`
      const pickupCity = record.pickup_city || record.pu_city || ''
      const dropoffCity = record.dropoff_city || record.do_city || ''

      if (!pickupCity || !dropoffCity) continue

      const citym = generateCitym(pickupCity, dropoffCity)

      await prisma.fleetPartnerCompletion.upsert({
        where: { externalId },
        create: {
          externalId,
          supplierName: record.supplier_name || record.supplier || record.fleet_partner || null,
          citym,
          completionDate: new Date(record.completion_date || record.date),
          truckType: record.truck_type || null,
          loadsCompleted: parseInt(record.loads_completed || record.loads || '0', 10),
        },
        update: {
          loadsCompleted: parseInt(record.loads_completed || record.loads || '0', 10),
          syncedAt: new Date(),
        },
      })
      count++
    }

    await prisma.redashSync.update({
      where: { endpoint: 'FLEET_PARTNER_COMPLETION' },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
        recordsCount: count,
        errorMessage: null,
      },
    })

    return count
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.redashSync.update({
      where: { endpoint: 'FLEET_PARTNER_COMPLETION' },
      data: { lastSyncStatus: 'FAILED', errorMessage },
    })

    throw error
  }
}

export async function syncSuppliers(): Promise<number> {
  const config = getConfig()

  if (!config.suppliersQueryId || !config.suppliersApiKey) {
    console.log('Skipping suppliers sync - missing config')
    return 0
  }

  await prisma.redashSync.upsert({
    where: { endpoint: 'SUPPLIERS' },
    create: { endpoint: 'SUPPLIERS', lastSyncStatus: 'IN_PROGRESS' },
    update: { lastSyncStatus: 'IN_PROGRESS', errorMessage: null },
  })

  try {
    const csv = await fetchCsv(config.suppliersQueryId, config.suppliersApiKey)
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]

    // Get all active organizations
    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    let count = 0
    for (const record of records) {
      const name = record.name || record.supplier_name || record.fleet_partner
      if (!name) continue

      const trimmedName = name.trim()
      const pointOfContact = record.point_of_contact || record.contact || null
      const email = record.email || null
      const phoneNumber = record.phone_number || record.phone || null

      // Sync supplier for each organization
      for (const org of organizations) {
        // Find if supplier already exists for this org
        const existing = await prisma.party.findFirst({
          where: {
            organizationId: org.id,
            name: { equals: trimmedName, mode: 'insensitive' },
            partyRole: 'SUPPLIER',
          },
        })

        if (existing) {
          // Update existing supplier with Redash data
          await prisma.party.update({
            where: { id: existing.id },
            data: {
              pointOfContact: pointOfContact || existing.pointOfContact,
              email: email || existing.email,
              phoneNumber: phoneNumber || existing.phoneNumber,
            },
          })
        } else {
          // Create new supplier from Redash data for this org
          await prisma.party.create({
            data: {
              organizationId: org.id,
              name: trimmedName,
              uniqueIdentifier: `sup_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`,
              pointOfContact,
              email,
              phoneNumber,
              partyRole: 'SUPPLIER',
              isActive: true,
            },
          })
        }
      }
      count++
    }

    await prisma.redashSync.update({
      where: { endpoint: 'SUPPLIERS' },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
        recordsCount: count,
        errorMessage: null,
      },
    })

    return count
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.redashSync.update({
      where: { endpoint: 'SUPPLIERS' },
      data: { lastSyncStatus: 'FAILED', errorMessage },
    })

    throw error
  }
}

export async function syncAll(): Promise<{ requests: number; completions: number; suppliers: number }> {
  const [requests, completions, suppliers] = await Promise.allSettled([
    syncActualRequests(),
    syncFleetCompletions(),
    syncSuppliers(),
  ])

  return {
    requests: requests.status === 'fulfilled' ? requests.value : 0,
    completions: completions.status === 'fulfilled' ? completions.value : 0,
    suppliers: suppliers.status === 'fulfilled' ? suppliers.value : 0,
  }
}

export async function getSyncStatus() {
  const syncs = await prisma.redashSync.findMany()
  return syncs.reduce((acc, sync) => {
    acc[sync.endpoint] = {
      lastSyncAt: sync.lastSyncAt,
      lastSyncStatus: sync.lastSyncStatus,
      recordsCount: sync.recordsCount,
      errorMessage: sync.errorMessage,
    }
    return acc
  }, {} as Record<string, unknown>)
}
