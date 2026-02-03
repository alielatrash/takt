import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'atrash93@gmail.com'
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organizationMemberships: {
        include: {
          organization: true
        }
      }
    }
  })

  if (user) {
    console.log('User exists:')
    console.log('ID:', user.id)
    console.log('Email:', user.email)
    console.log('Name:', user.firstName, user.lastName)
    console.log('Email Verified:', user.emailVerified)
    console.log('Current Org ID:', user.currentOrgId)
    console.log('\nMemberships:')
    user.organizationMemberships.forEach(m => {
      console.log('  - Org:', m.organization.name, '(', m.organization.slug, ')')
      console.log('    Role:', m.role)
    })
  } else {
    console.log('User does not exist')
  }

  await prisma.$disconnect()
}

main().catch(console.error)
