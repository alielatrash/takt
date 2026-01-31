import { cn } from '@/lib/utils'
import Image from 'next/image'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <Image
        src="/silsila-logo.png"
        alt="Silsila Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  )
}
