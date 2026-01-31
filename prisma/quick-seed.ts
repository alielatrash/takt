import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Quick seed: Adding essential data...')

  // Add a few clients
  const clients = ['ABC Company', 'XYZ Logistics', 'Global Transport', 'Fast Freight', 'Saudi Cargo']
  for (const name of clients) {
    await prisma.client.upsert({
      where: { name },
      update: {},
      create: { name, code: name.substring(0, 3).toUpperCase() },
    })
  }
  console.log(`✓ Added ${clients.length} clients`)

  // Add a few suppliers
  const suppliers = [
    { name: 'ABUDAWOOD LOGISTICS', code: 'ABU' },
    { name: 'AL BARRAK LOGITICS SERVICE CO LTD', code: 'BAR' },
    { name: 'AL GHAZAL TRANSPORT', code: 'GHZ' },
    { name: 'Al Wefaq Transport', code: 'WFQ' },
    { name: 'AlFatras al tayir (FMT)', code: 'FMT' },
  ]
  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { name: supplier.name },
      update: {},
      create: { name: supplier.name, code: supplier.code },
    })
  }
  console.log(`✓ Added ${suppliers.length} suppliers`)

  // Add truck types
  const truckTypes = ['Flatbed', 'Curtain Side', 'Reefer', 'Lowbed', 'Dyna']
  for (const name of truckTypes) {
    await prisma.truckType.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log(`✓ Added ${truckTypes.length} truck types`)

  // Add key cities
  const cities = [
    { name: 'Riyadh', region: 'Central' },
    { name: 'Jeddah', region: 'West' },
    { name: 'Dammam', region: 'East' },
    { name: 'Makkah Al-Mukarrama', region: 'West' },
    { name: 'Al-Madina Al-Munawwara', region: 'West' },
    { name: 'Abha', region: 'South' },
    { name: 'Tabuk', region: 'North' },
    { name: 'AMAALA', region: 'North' },
    { name: 'Jubail', region: 'East' },
    { name: 'Yanbu', region: 'West' },
  ]
  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: {},
      create: { name: city.name, region: city.region, code: city.name.substring(0, 3).toUpperCase() },
    })
  }
  console.log(`✓ Added ${cities.length} cities`)

  // Add users
  const passwordHash = await bcrypt.hash('Password1', 10)

  await prisma.user.upsert({
    where: { email: 'admin@silsila.app' },
    update: {},
    create: {
      email: 'admin@silsila.app',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
    },
  })

  await prisma.user.upsert({
    where: { email: 'karim@silsila.app' },
    update: {},
    create: {
      email: 'karim@silsila.app',
      passwordHash,
      firstName: 'Ali',
      lastName: 'El Atrash',
      mobileNumber: '534035184',
      role: 'SUPPLY_PLANNER',
      isActive: true,
    },
  })

  await prisma.user.upsert({
    where: { email: 'elatrash.ali@gmail.com' },
    update: {},
    create: {
      email: 'elatrash.ali@gmail.com',
      passwordHash,
      firstName: 'Ali',
      lastName: 'El Atrash',
      mobileNumber: '534035184',
      role: 'DEMAND_PLANNER',
      isActive: true,
    },
  })

  console.log('✓ Added 3 users')

  // Add a planning week using correct date calculation
  // Week 5 of 2026: Sunday Jan 25 - Saturday Jan 31
  const weekStart = new Date('2026-01-25')
  const weekEnd = new Date('2026-01-31')
  await prisma.planningWeek.upsert({
    where: {
      year_weekNumber: {
        year: 2026,
        weekNumber: 5,
      },
    },
    update: { weekStart, weekEnd }, // Update dates if week already exists
    create: {
      weekStart,
      weekEnd,
      year: 2026,
      weekNumber: 5,
      isCurrent: true,
      isLocked: false,
    },
  })
  console.log('✓ Added planning week 5 (Jan 25-31)')

  console.log('\n✅ Quick seed completed!')
}

main()
  .catch((e) => {
    console.error('Quick seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
