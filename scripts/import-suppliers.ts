import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function importSuppliers() {
  try {
    console.log('Reading CSV file...')
    const csvPath = '/tmp/suppliers.csv'
    const csvContent = fs.readFileSync(csvPath, 'utf-8')

    // Parse CSV
    const lines = csvContent.split('\n').slice(1) // Skip header
    const suppliers = new Set<string>()

    // Extract unique supplier names
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Split by comma, but handle potential commas in names
      const [partnerEntityName] = trimmedLine.split(',')
      if (partnerEntityName && partnerEntityName !== 'partner_entity_name') {
        suppliers.add(partnerEntityName.trim())
      }
    }

    console.log(`Found ${suppliers.size} unique suppliers`)

    // Get existing suppliers
    const existingSuppliers = await prisma.supplier.findMany({
      select: { name: true }
    })
    const existingNames = new Set(existingSuppliers.map(s => s.name))

    // Filter out suppliers that already exist
    const newSuppliers = Array.from(suppliers).filter(name => !existingNames.has(name))

    console.log(`${existingNames.size} suppliers already exist`)
    console.log(`Importing ${newSuppliers.length} new suppliers...`)

    if (newSuppliers.length === 0) {
      console.log('No new suppliers to import')
      return
    }

    // Import in batches to avoid overwhelming the database
    const batchSize = 100
    let imported = 0

    for (let i = 0; i < newSuppliers.length; i += batchSize) {
      const batch = newSuppliers.slice(i, i + batchSize)

      await prisma.supplier.createMany({
        data: batch.map(name => ({
          name,
          isActive: true,
        })),
        skipDuplicates: true,
      })

      imported += batch.length
      console.log(`Imported ${imported}/${newSuppliers.length} suppliers`)
    }

    console.log('✓ Import completed successfully!')

    // Show final count
    const totalSuppliers = await prisma.supplier.count()
    console.log(`Total suppliers in database: ${totalSuppliers}`)

  } catch (error) {
    console.error('Error importing suppliers:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

importSuppliers()
