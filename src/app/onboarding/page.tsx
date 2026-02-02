'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'

const onboardingSchema = z.object({
  role: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER']),
  managedClientIds: z.array(z.string()).optional(),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

interface Client {
  id: string
  name: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedRole, setSelectedRole] = useState<'DEMAND_PLANNER' | 'SUPPLY_PLANNER' | null>(null)

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: undefined,
      managedClientIds: [],
    },
  })

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients')
        const json = await res.json()
        if (json.success) {
          setClients(json.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      } finally {
        setIsFetching(false)
      }
    }

    fetchClients()
  }, [])

  const handleNext = () => {
    const role = form.getValues('role')
    if (!role) {
      toast.error('Please select a role')
      return
    }
    setSelectedRole(role)
    if (role === 'DEMAND_PLANNER') {
      setStep(2)
    } else {
      // Supply planners skip client selection
      handleSubmit({ role, managedClientIds: [] })
    }
  }

  const handleSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!json.success) {
        toast.error(json.error?.message || 'Failed to complete onboarding')
        return
      }

      toast.success('Welcome to Takt!')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const progressPercentage = step === 1 ? 50 : 100

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Takt!</CardTitle>
          <CardDescription>
            Let's get you set up in just a few quick steps
          </CardDescription>
          <div className="pt-4">
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Step {step} of 2
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Step 1: Select Role */}
              {step === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">What's your role?</FormLabel>
                        <FormDescription>
                          Choose the role that best describes your responsibilities
                        </FormDescription>
                        <FormControl>
                          <div className="grid gap-4 pt-2">
                            <div
                              onClick={() => field.onChange('DEMAND_PLANNER')}
                              className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                field.value === 'DEMAND_PLANNER'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                                <User className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold">Demand Planner</div>
                                <div className="text-sm text-muted-foreground">
                                  Forecast customer demands and manage client requirements
                                </div>
                              </div>
                              {field.value === 'DEMAND_PLANNER' && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                            </div>

                            <div
                              onClick={() => field.onChange('SUPPLY_PLANNER')}
                              className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                field.value === 'SUPPLY_PLANNER'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                <Users className="h-6 w-6 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold">Supply Planner</div>
                                <div className="text-sm text-muted-foreground">
                                  Manage supplier capacity and coordinate supply commitments
                                </div>
                              </div>
                              {field.value === 'SUPPLY_PLANNER' && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!form.getValues('role')}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Select Managed Clients (Demand Planners only) */}
              {step === 2 && selectedRole === 'DEMAND_PLANNER' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-2">
                      Which clients do you manage?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select the clients you'll be creating demand forecasts for. These will appear first when you create a new demand plan.
                    </p>
                  </div>

                  {isFetching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No clients found. You can add clients later from the Clients page.</p>
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="managedClientIds"
                      render={() => (
                        <FormItem>
                          <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-4">
                            {clients.map((client) => (
                              <FormField
                                key={client.id}
                                control={form.control}
                                name="managedClientIds"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={client.id}
                                      className="flex items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(client.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), client.id])
                                              : field.onChange(
                                                  field.value?.filter((value) => value !== client.id)
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal cursor-pointer">
                                        {client.name}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Complete Setup
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
