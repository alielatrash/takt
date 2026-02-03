import { prisma } from '../src/lib/prisma'

async function checkRecords() {
  // Get the user's current organization
  const user = await prisma.user.findUnique({
    where: { email: 'ali@trella.app' },
    select: { currentOrgId: true }
  })
  
  if (!user || !user.currentOrgId) {
    console.log('User or organization not found')
    return
  }
  
  const orgId = user.currentOrgId
  console.log('Organization ID:', orgId)
  console.log('')
  
  // Count existing records
  const citiesCount = await prisma.location.count({
    where: {
      organizationId: orgId,
      locationType: 'CITY'
    }
  })
  
  const clientsCount = await prisma.party.count({
    where: {
      organizationId: orgId,
      partyRole: 'CUSTOMER'
    }
  })
  
  const suppliersCount = await prisma.party.count({
    where: {
      organizationId: orgId,
      partyRole: 'SUPPLIER'
    }
  })
  
  const truckTypesCount = await prisma.resourceType.count({
    where: { organizationId: orgId }
  })
  
  console.log('Existing records in Trella organization:')
  console.log('Cities:', citiesCount)
  console.log('Clients:', clientsCount)
  console.log('Suppliers:', suppliersCount)
  console.log('Truck Types:', truckTypesCount)
  
  // Sample some cities
  console.log('\nSample cities (first 5):')
  const cities = await prisma.location.findMany({
    where: {
      organizationId: orgId,
      locationType: 'CITY'
    },
    select: { name: true, region: true },
    take: 5
  })
  console.table(cities)
  
  // Sample some clients
  console.log('\nSample clients (first 5):')
  const clients = await prisma.party.findMany({
    where: {
      organizationId: orgId,
      partyRole: 'CUSTOMER'
    },
    select: { name: true, pointOfContact: true },
    take: 5
  })
  console.table(clients)
}

checkRecords()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
