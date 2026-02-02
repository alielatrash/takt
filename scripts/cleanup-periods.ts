import { prisma } from '../src/lib/prisma'

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'CLEOTESTT' },
    include: { settings: true }
  })

  if (!org) {
    console.log('Org not found')
    return
  }

  console.log('Org:', org.name, 'Planning:', org.settings?.planningCycle)

  // Delete weekly periods (where weekEnd < month end)
  const result = await prisma.planningWeek.deleteMany({
    where: {
      organizationId: org.id,
      weekStart: { gte: new Date('2026-02-01') },
      weekEnd: { lt: new Date('2026-02-28T23:59:59') }
    }
  })

  console.log('Deleted', result.count, 'weekly periods')

  await prisma.$disconnect()
}

main()
