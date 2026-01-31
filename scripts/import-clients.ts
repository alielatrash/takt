import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function importClients() {
  try {
    console.log('Reading CSV file...')
    const csvPath = '/tmp/clients.csv'
    const csvContent = fs.readFileSync(csvPath, 'utf-8')

    // Parse CSV
    const lines = csvContent.split('\n').slice(1) // Skip header
    const entities = new Set<string>()

    // Extract unique entity names
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      const [entity] = trimmedLine.split(',')
      if (entity && entity !== 'entity') {
        entities.add(entity.trim())
      }
    }

    console.log(`Found ${entities.size} unique entities`)

    // Get existing clients
    const existingClients = await prisma.client.findMany({
      select: { name: true }
    })
    const existingNames = new Set(existingClients.map(c => c.name))

    // Filter out entities that already exist
    const newEntities = Array.from(entities).filter(name => !existingNames.has(name))

    console.log(`${existingNames.size} clients already exist`)
    console.log(`Importing ${newEntities.length} new clients...`)

    if (newEntities.length === 0) {
      console.log('No new clients to import')
      return
    }

    // Import in batches to avoid overwhelming the database
    const batchSize = 100
    let imported = 0

    for (let i = 0; i < newEntities.length; i += batchSize) {
      const batch = newEntities.slice(i, i + batchSize)

      await prisma.client.createMany({
        data: batch.map(name => ({
          name,
          isActive: true,
        })),
        skipDuplicates: true,
      })

      imported += batch.length
      console.log(`Imported ${imported}/${newEntities.length} clients`)
    }

    console.log('✓ Import completed successfully!')

    // Show final count
    const totalClients = await prisma.client.count()
    console.log(`Total clients in database: ${totalClients}`)

  } catch (error) {
    console.error('Error importing clients:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

importClients()
