import { z } from 'zod'

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  position: z.string().min(2, 'Position must be at least 2 characters').max(100),
  number: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
  company: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  country: z.string().min(2, 'Country must be at least 2 characters').max(100),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>
