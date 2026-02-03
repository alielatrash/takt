/**
 * One-time script to mark all existing users as email verified
 * Run with: npx tsx scripts/verify-existing-users.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating existing users to mark emails as verified...')

  const result = await prisma.user.updateMany({
    where: {
      emailVerified: false,
    },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  console.log(`✓ Updated ${result.count} users`)
  console.log('All existing users can now log in without email verification.')
}

main()
  .catch((error) => {
    console.error('Error updating users:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
