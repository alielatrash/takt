import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Removing teamtakt.app domain claim from Trella organization...')

  const result = await prisma.organizationDomain.deleteMany({
    where: {
      domain: 'teamtakt.app'
    }
  })

  console.log(`✓ Removed ${result.count} teamtakt.app domain claim(s)`)
  console.log('teamtakt.app is now available for new signups')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
