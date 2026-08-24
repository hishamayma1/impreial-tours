'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/Button'
import {
  quoteRequestSchema,
  type QuoteRequestInput,
  type QuoteRequestFormValues,
} from '@/lib/validation/booking'
import type { Locale } from '@/i18n/routing'

const inputClass =
  'w-full rounded-lg border border-hairline bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

type Result = { quoteId: string; whatsappUrl: string | null }

/**
 * The custom-trip form. Validated with the same Zod schema the route handler uses, so
 * the two can never drift apart.
 *
 * On success the page shows its own confirmation and only then opens WhatsApp — the
 * enquiry is already recorded, so a blocked pop-up never loses it.
 */
export const CustomQuoteForm = () => {
  const t = useTranslations('quote')
  const forms = useTranslations('forms')
  const locale = useLocale() as Locale

  const [result, setResult] = useState<Result | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<QuoteRequestFormValues, unknown, QuoteRequestInput>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      name: '', phone: '', email: '', pickupLocation: '', dropoffLocation: '',
      stops: [], date: '', time: '', passengers: 2, luggage: 2,
      vehiclePreference: '', specialRequests: '',
      preferredLanguage: locale,
      captchaToken: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    // react-hook-form needs an object shape for arrays; the schema takes plain
    // strings, so this is mapped on submit.
    name: 'stops' as never,
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      const response = await fetch('/api/whatsapp-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          stops: (values.stops ?? []).map((stop: unknown) =>
            typeof stop === 'string' ? stop : String((stop as { value?: string })?.value ?? ''),
          ),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setServerError(data.error === 'validation' ? forms('required') : forms('genericError'))
        return
      }

      setResult({ quoteId: data.quoteId, whatsappUrl: data.whatsappUrl })

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      setServerError(forms('genericError'))
    }
  })

  if (result) {
    return (
      <div className="rounded-xl border border-hairline bg-surface-container-lowest p-8">
        <h2 className="font-headline-card text-headline-card text-primary">{t('successTitle')}</h2>
        <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
          {t('successBody', { reference: result.quoteId })}
        </p>
        {result.whatsappUrl ? (
          <a
            href={result.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center rounded-full bg-brand px-6 py-3 font-body-md text-body-md text-on-primary"
          >
            {t('openWhatsapp')}
          </a>
        ) : null}
      </div>
    )
  }

  const Field = ({
    name,
    type = 'text',
    required = false,
  }: {
    name: keyof QuoteRequestFormValues
    type?: string
    required?: boolean
  }) => (
    <label className="flex flex-col gap-1.5">
      <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
        {t(`fields.${name}`)}
        {required ? <span aria-hidden> *</span> : null}
      </span>
      <input
        type={type}
        {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
        aria-invalid={errors[name] ? 'true' : undefined}
        className={inputClass}
      />
      {errors[name] ? (
        <span role="alert" className="font-body-md text-caption text-error">
          {forms('required')}
        </span>
      ) : null}
    </label>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="name" required />
        <Field name="phone" required />
        <Field name="email" type="email" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="pickupLocation" required />
        <Field name="dropoffLocation" />
      </div>

      <div>
        <span className="mb-2 block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
          {t('fields.stops')}
        </span>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3">
              <input
                {...register(`stops.${index}` as never)}
                className={inputClass}
                aria-label={`${t('fields.stops')} ${index + 1}`}
              />
              <Button type="button" variant="outlineNavy" onClick={() => remove(index)}>
                {t('removeStop')}
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-3"
          onClick={() => append('' as never)}
        >
          {t('addStop')}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field name="date" type="date" />
        <Field name="time" type="time" />
        <Field name="passengers" type="number" />
        <Field name="luggage" type="number" />
      </div>

      <Field name="vehiclePreference" />

      <label className="flex flex-col gap-1.5">
        <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
          {t('fields.specialRequests')}
        </span>
        <textarea rows={4} {...register('specialRequests')} className={inputClass} />
      </label>

      {/* Prefilled from the current locale so staff know which language to reply in. */}
      <input type="hidden" {...register('preferredLanguage')} />

      {serverError ? (
        <p role="alert" className="font-body-md text-body-md text-error">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" variant="navy" size="lg" disabled={isSubmitting}>
        {isSubmitting ? forms('submitting') : t('submit')}
      </Button>
    </form>
  )
}
