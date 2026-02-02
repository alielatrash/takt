'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const createUserFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  mobileNumber: z.string().optional(),
  role: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER', 'ADMIN']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const inviteUserFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['DEMAND_PLANNER', 'SUPPLY_PLANNER', 'ADMIN']),
})

type CreateUserFormData = z.infer<typeof createUserFormSchema>
type InviteUserFormData = z.infer<typeof inviteUserFormSchema>

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateUserFormData) => Promise<void>
  onInvite: (data: InviteUserFormData) => Promise<void>
}

export function UserFormDialog({ open, onOpenChange, onSubmit, onInvite }: UserFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState<'create' | 'invite'>('invite')

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      mobileNumber: '',
      password: '',
    },
  })

  const inviteForm = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: {
      email: '',
    },
  })

  const handleCreateSubmit = async (data: CreateUserFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      createForm.reset()
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInviteSubmit = async (data: InviteUserFormData) => {
    setIsSubmitting(true)
    try {
      await onInvite(data)
      inviteForm.reset()
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    createForm.reset()
    inviteForm.reset()
    setMode('invite')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            {mode === 'invite'
              ? 'Send an invitation email to add a new user to your organization.'
              : 'Create a new user account with the specified role and credentials.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <div className="space-y-2">
            <Label>Method</Label>
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as 'create' | 'invite')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="invite" id="invite" />
                <Label htmlFor="invite" className="font-normal cursor-pointer">
                  Send invitation email (Recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="create" id="create" />
                <Label htmlFor="create" className="font-normal cursor-pointer">
                  Create account with password
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Invite form */}
          {mode === 'invite' && (
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        An invitation email will be sent to this address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={inviteForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DEMAND_PLANNER">Demand Planner</SelectItem>
                          <SelectItem value="SUPPLY_PLANNER">Supply Planner</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {/* Create form */}
          {mode === 'create' && (
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@teamtakt.app" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="534035184" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DEMAND_PLANNER">Demand Planner</SelectItem>
                          <SelectItem value="SUPPLY_PLANNER">Supply Planner</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Min 8 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
