'use client'

import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import type { StepErrors } from '@/lib/booking/validate'
import { cn } from '@/lib/utils'
import { useBookingStore } from '@/stores'

import { Field, controlClass } from './fields'

const FIELDS = [
  { key: 'firstName', type: 'text', required: true, autoComplete: 'given-name', max: 80 },
  { key: 'lastName', type: 'text', required: false, autoComplete: 'family-name', max: 80 },
  { key: 'email', type: 'email', required: true, autoComplete: 'email', max: 200 },
  { key: 'phone', type: 'tel', required: true, autoComplete: 'tel', max: 40 },
  { key: 'country', type: 'text', required: false, autoComplete: 'country-name', max: 80 },
] as const

/**
 * The lead guest. Name, email and phone are required for every service: the email
 * carries the confirmation and the phone is how the team confirms pickup details —
 * the same three the transfer form has always required.
 */
export const ContactStep = ({ errors }: { errors: StepErrors }) => {
  const t = useTranslations('booking')

  const contact = useBookingStore(useShallow((state) => state.contact))
  const setContact = useBookingStore((state) => state.setContact)
  const serviceType = useBookingStore((state) => state.serviceType)

  const err = (key: string) => (errors[key] ? t(`errors.${errors[key]}`) : '')

  return (
    <section>
      <h2 className="mb-6 font-headline-card text-headline-card text-primary">
        {t('steps.contact')}
      </h2>

      <div className="grid gap-x-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field
            key={field.key}
            label={t(`fields.${field.key}`)}
            htmlFor={`bk-${field.key}`}
            required={field.required}
            error={err(field.key)}
            hint={field.key === 'phone' ? t('fields.phoneHint') : undefined}
          >
            <input
              id={`bk-${field.key}`}
              type={field.type}
              inputMode={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : undefined}
              required={field.required}
              maxLength={field.max}
              value={contact[field.key]}
              autoComplete={field.autoComplete}
              placeholder={field.key === 'phone' ? '+20 100 123 4567' : undefined}
              aria-invalid={!!errors[field.key] || undefined}
              onChange={(event) => setContact({ [field.key]: event.target.value })}
              className={cn(controlClass, errors[field.key] && 'border-error/60')}
            />
          </Field>
        ))}
      </div>

      <Field label={t('fields.notes')} htmlFor="bk-notes">
        <textarea
          id="bk-notes"
          rows={4}
          maxLength={2000}
          value={contact.notes}
          placeholder={serviceType === 'hotel' ? t('fields.notesHotel') : t('fields.notesPlaceholder')}
          onChange={(event) => setContact({ notes: event.target.value })}
          className={cn(controlClass, 'h-auto py-3')}
        />
      </Field>
    </section>
  )
}
