import { prisma } from '../src/lib/prisma'
import { randomBytes } from 'crypto'

// Simple CUID-like generator
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64url').substring(0, 16)
  return `${timestamp}${randomPart}`
}

async function main() {
  console.log('Starting migration: Populating uniqueIdentifier for Party records...')

  // Get all parties without a uniqueIdentifier
  const parties = await prisma.party.findMany({
    where: {
      uniqueIdentifier: null,
    },
    select: {
      id: true,
      name: true,
      partyRole: true,
    },
  })

  console.log(`Found ${parties.length} parties without uniqueIdentifier`)

  if (parties.length === 0) {
    console.log('✅ All parties already have unique identifiers')
    return
  }

  // Update each party with a unique identifier
  let updated = 0
  for (const party of parties) {
    const prefix = party.partyRole === 'CUSTOMER' ? 'cli' :
                   party.partyRole === 'SUPPLIER' ? 'sup' :
                   party.partyRole === 'CARRIER' ? 'car' :
                   party.partyRole === 'VENDOR' ? 'ven' :
                   party.partyRole === 'MANUFACTURER' ? 'mfg' :
                   party.partyRole === 'DISTRIBUTOR' ? 'dst' : 'pty'

    const uniqueId = `${prefix}_${generateCuid()}`

    await prisma.party.update({
      where: { id: party.id },
      data: { uniqueIdentifier: uniqueId },
    })

    updated++
    if (updated % 10 === 0) {
      console.log(`Progress: ${updated}/${parties.length} parties updated`)
    }
  }

  console.log(`✅ Successfully updated ${updated} parties with unique identifiers`)

  await prisma.$disconnect()
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
