import { prisma } from '../src/lib/prisma'

async function verifyUserEmail(email: string) {
  console.log(`Verifying email for: ${email}`)
  
  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { emailVerified: true },
  })
  
  console.log('✅ Email verified successfully!')
  console.log('User:', {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
  })
}

const email = process.argv[2] || 'ali@trella.app'
verifyUserEmail(email)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
