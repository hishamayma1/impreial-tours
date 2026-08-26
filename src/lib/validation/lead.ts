import { z } from 'zod'

import { locales } from '@/i18n/routing'

/**
 * The home page enquiry ("plan my journey") form.
 *
 * Deliberately shorter than `quoteRequestSchema`: that one prices a specific transfer
 * and needs a pick-up, a drop-off and a vehicle class, while this one only has to
 * capture enough for a salesperson to call back. Every extra required field on a
 * top-of-funnel form costs completions, so the required set is name plus one way to
 * reach the person, and everything else is optional context.
 *
 * Both forms land in the same `quote-requests` collection, so there is one inbox to
 * work rather than two.
 */
export const leadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  serviceInterest: z.enum(['tours', 'hotels', 'transfers', 'bicycles']),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  travellers: z.number().int().min(1).max(60),
  message: z.string().trim().max(2000).optional().default(''),
  preferredLanguage: z.enum(locales),
  /**
   * Honeypot. Bots fill every input they find; a human never sees this one, so any
   * value at all is a bot and the handler drops the submission.
   */
  company: z.string().max(200).optional().default(''),
  /** Turnstile / reCAPTCHA response, verified server-side when configured. */
  captchaToken: z.string().max(4000).optional().default(''),
})

export type LeadInput = z.output<typeof leadSchema>

/** What the form holds before Zod applies its defaults. */
export type LeadFormValues = z.input<typeof leadSchema>
