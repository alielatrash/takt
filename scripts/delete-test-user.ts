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
    console.log('Deleting user:', user.email)
    console.log('Organization:', user.organizationMemberships[0]?.organization.name)
    
    // Delete the organization (this will cascade delete user memberships)
    if (user.organizationMemberships[0]) {
      const orgId = user.organizationMemberships[0].organizationId
      await prisma.organization.delete({
        where: { id: orgId }
      })
      console.log('Organization deleted')
    }
    
    console.log('User deleted successfully')
  } else {
    console.log('User not found')
  }

  await prisma.$disconnect()
}

main().catch(console.error)
