'use client'

import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { useBookingStore } from '@/stores'

export const ContactStep = () => {
  const t = useTranslations('booking')
  const forms = useTranslations('forms')

  const contact = useBookingStore(useShallow((state) => state.contact))
  const setContact = useBookingStore((state) => state.setContact)

  const fields = [
    { key: 'firstName' as const, type: 'text', required: true },
    { key: 'lastName' as const, type: 'text', required: false },
    { key: 'email' as const, type: 'email', required: true },
    { key: 'phone' as const, type: 'tel', required: false },
    { key: 'country' as const, type: 'text', required: false },
  ]

  return (
    <section>
      <h2 className="mb-6 font-headline-card text-headline-card text-primary">
        {t('steps.contact')}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-2">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              {t(`fields.${field.key}`)}
              {field.required ? <span aria-hidden> *</span> : null}
            </span>
            <input
              type={field.type}
              required={field.required}
              value={contact[field.key]}
              autoComplete={field.key === 'email' ? 'email' : field.key}
              onChange={(event) => setContact({ [field.key]: event.target.value })}
              className="rounded-lg border border-hairline bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </label>
        ))}
      </div>

      <label className="mt-4 flex flex-col gap-2">
        <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
          {t('fields.notes')}
        </span>
        <textarea
          rows={4}
          value={contact.notes}
          onChange={(event) => setContact({ notes: event.target.value })}
          className="rounded-lg border border-hairline bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      </label>

      <p className="mt-4 font-body-md text-caption text-on-surface-variant">
        {forms('required')}: {t('fields.firstName')}, {t('fields.email')}
      </p>
    </section>
  )
}
