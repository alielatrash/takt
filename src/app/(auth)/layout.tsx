import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Logo } from '@/components/layout/logo'

export const dynamic = 'force-dynamic'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (session) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="mb-8 flex items-center gap-2">
        <Logo size="md" />
        <span className="text-2xl font-bold">Silsila</span>
      </div>
      {children}
      <p className="mt-8 text-sm text-muted-foreground">
        Silsila &copy; {new Date().getFullYear()}
      </p>
    </div>
  )
}
