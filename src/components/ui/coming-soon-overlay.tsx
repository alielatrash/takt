'use client'

import { useState } from 'react'
import { Lock, Sparkles, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ComingSoonOverlayProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function ComingSoonOverlay({
  children,
  title = "Premium Feature",
  description = "This feature is available on the Professional plan."
}: ComingSoonOverlayProps) {
  const [isModalOpen, setIsModalOpen] = useState(true)

  if (!isModalOpen) {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-[calc(100vh-12rem)]">
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>

      {/* Premium Feature Modal Overlay - Fixed positioning for proper centering */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm"
        onClick={() => setIsModalOpen(false)}
      >
        <Card
          className="w-full max-w-md shadow-2xl border-2 mx-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Professional Tier
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Unlock advanced analytics and reporting with our Professional plan
            </p>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => window.open('/pricing', '_blank')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade Subscription
            </Button>
            <p className="text-xs text-muted-foreground">
              Or contact sales for Enterprise options
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
