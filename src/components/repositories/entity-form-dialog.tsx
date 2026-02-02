'use client'

import { useEffect } from 'react'
import { useForm, type FieldValues, type DefaultValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { usePhoneValidation } from '@/hooks/use-phone-validation'

interface FormFieldConfig {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  type?: 'text' | 'phone' | 'number'
}

interface EntityFormDialogProps<T extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
  fields: FormFieldConfig[]
  defaultValues: DefaultValues<T>
  onSubmit: (data: T) => Promise<void>
  isLoading: boolean
  isEdit?: boolean
}

export function EntityFormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  fields,
  defaultValues,
  onSubmit,
  isLoading,
  isEdit = false,
}: EntityFormDialogProps<T>) {
  const { config: phoneConfig } = usePhoneValidation()

  const form = useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValues)
    }
  }, [open, defaultValues, form])

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the parent component
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {fields.map((field) => {
              const isPhoneField = field.type === 'phone' || field.name === 'phoneNumber'
              const isNumberField = field.type === 'number'
              const placeholder = isPhoneField ? phoneConfig.placeholder : field.placeholder

              return (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name as never}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={isNumberField ? 'number' : 'text'}
                          placeholder={placeholder}
                          {...formField}
                          value={formField.value as string || ''}
                        />
                      </FormControl>
                      {isPhoneField && (
                        <FormDescription className="text-xs">
                          Format: {phoneConfig.placeholder}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )
            })}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
