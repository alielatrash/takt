import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      emailVerified: true,
      createdAt: true,
      organizationMemberships: {
        include: {
          organization: {
            select: {
              name: true,
              slug: true
            }
          }
        }
      }
    }
  })

  console.log('Recent users (last 5):')
  console.log('======================\n')
  
  for (const user of users) {
    console.log('Email:', user.email)
    console.log('Name:', user.firstName, user.lastName)
    console.log('ID:', user.id)
    console.log('Email Verified:', user.emailVerified)
    console.log('Created:', new Date(user.createdAt).toISOString())
    if (user.organizationMemberships.length > 0) {
      console.log('Organization:', user.organizationMemberships[0].organization.name)
    }
    console.log('---\n')
  }

  await prisma.$disconnect()
}

main().catch(console.error)
