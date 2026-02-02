import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // Redirect authenticated users directly to dashboard
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="mb-8">
        <Image
          src="/takt-logo-blue.png"
          alt="Takt"
          width={150}
          height={48}
          className="h-12 w-auto"
          priority
        />
      </div>
      {children}
      <p className="mt-8 text-sm text-muted-foreground">
        Takt &copy; {new Date().getFullYear()}
      </p>
    </div>
  )
}
