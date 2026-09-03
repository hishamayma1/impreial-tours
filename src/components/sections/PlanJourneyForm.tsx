'use client'

import { useId, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Icon } from '@/components/ui/Icon'
import { leadSchema, type LeadInput, type LeadFormValues } from '@/lib/validation/lead'
import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

const INTERESTS = ['tours', 'hotels', 'transfers', 'bicycles'] as const

const fieldClass =
  'w-full rounded-xl border border-hairline bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-primary ' +
  'transition-colors placeholder:text-outline focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'

const labelClass = 'mb-1.5 block font-label-caps text-xs uppercase tracking-widest text-on-surface-variant'

type Result = { reference: string | null; whatsappUrl: string | null }

/**
 * The home page's enquiry form — the one place on the site a visitor can start a
 * conversation without first picking a product.
 *
 * Validated with the same Zod schema the route handler parses, so the two can never
 * drift. The success state is rendered in place rather than by navigating: the point
 * of putting the form on the home page is that answering it costs no page load.
 */
export const PlanJourneyForm = () => {
  const t = useTranslations('plan')
  const forms = useTranslations('forms')
  const locale = useLocale() as Locale
  const fieldId = useId()

  const [result, setResult] = useState<Result | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues, unknown, LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      serviceInterest: 'tours',
      date: '',
      travellers: 2,
      message: '',
      preferredLanguage: locale,
      company: '',
      captchaToken: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setServerError(data.error === 'validation' ? forms('required') : forms('genericError'))
        return
      }

      setResult({ reference: data.reference, whatsappUrl: data.whatsappUrl })
    } catch {
      setServerError(forms('genericError'))
    }
  })

  if (result) {
    return (
      <div
        // Announced rather than merely shown: the form it replaces was the focused
        // region, so a screen-reader user gets no other signal that anything happened.
        role="status"
        aria-live="polite"
        className="flex h-full flex-col justify-center rounded-3xl border border-hairline bg-surface-container-lowest p-8 text-center shadow-widget md:p-10"
      >
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h3 className="font-headline-card text-headline-card text-primary">{t('successTitle')}</h3>
        <p className="mx-auto mt-3 max-w-sm font-body-md text-body-md text-on-surface-variant">
          {result.reference
            ? t('successBody', { reference: result.reference })
            : t('successBodyPlain')}
        </p>

        {result.whatsappUrl ? (
          <a
            href={result.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-body-md font-medium text-white transition-colors hover:bg-brand-light"
          >
            <Icon name="whatsapp" className="h-5 w-5" />
            {t('openWhatsapp')}
          </a>
        ) : null}
      </div>
    )
  }

  /**
   * `noValidate` hands validation to Zod alone. Left on, the browser's own bubbles
   * fire first, in the browser's language rather than the page's, and stop the
   * translated messages below each field from ever being seen.
   */
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative rounded-3xl border border-hairline bg-surface-container-lowest p-6 shadow-widget md:p-8"
    >
      <h3 className="font-headline-card text-headline-card text-primary">{t('formTitle')}</h3>
      <p className="mt-2 font-body-md text-caption text-on-surface-variant">{t('formNote')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${fieldId}-name`} className={labelClass}>
            {t('fields.name')}
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            className={cn(fieldClass, errors.name && 'border-error')}
            {...register('name')}
          />
          {errors.name ? (
            <p className="mt-1.5 font-body-md text-caption text-error">{forms('required')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${fieldId}-phone`} className={labelClass}>
            {t('fields.phone')}
          </label>
          <input
            id={`${fieldId}-phone`}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            className={cn(fieldClass, errors.phone && 'border-error')}
            {...register('phone')}
          />
          {errors.phone ? (
            <p className="mt-1.5 font-body-md text-caption text-error">{forms('invalidPhone')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${fieldId}-email`} className={labelClass}>
            {t('fields.email')}
          </label>
          <input
            id={`${fieldId}-email`}
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className={cn(fieldClass, errors.email && 'border-error')}
            {...register('email')}
          />
          {errors.email ? (
            <p className="mt-1.5 font-body-md text-caption text-error">{forms('invalidEmail')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${fieldId}-interest`} className={labelClass}>
            {t('fields.interest')}
          </label>
          <select
            id={`${fieldId}-interest`}
            className={fieldClass}
            {...register('serviceInterest')}
          >
            {INTERESTS.map((interest) => (
              <option key={interest} value={interest}>
                {t(`interests.${interest}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${fieldId}-date`} className={labelClass}>
            {t('fields.date')}
          </label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                id={`${fieldId}-date`}
                value={field.value ?? ''}
                onChange={field.onChange}
                className="w-full"
              />
            )}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${fieldId}-travellers`} className={labelClass}>
            {t('fields.travellers')}
          </label>
          <input
            id={`${fieldId}-travellers`}
            type="number"
            min={1}
            max={60}
            className={fieldClass}
            {...register('travellers', { valueAsNumber: true })}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${fieldId}-message`} className={labelClass}>
            {t('fields.message')}
          </label>
          <textarea
            id={`${fieldId}-message`}
            rows={3}
            placeholder={t('fields.messagePlaceholder')}
            className={cn(fieldClass, 'resize-y')}
            {...register('message')}
          />
        </div>
      </div>

      {/*
        Honeypot. Hidden from sight and from the accessibility tree, and skipped by the
        tab order, so no human ever meets it — anything that fills it in is a bot.
      */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${fieldId}-company`}>Company</label>
        <input id={`${fieldId}-company`} type="text" tabIndex={-1} autoComplete="off" {...register('company')} />
      </div>

      {serverError ? (
        <p role="alert" className="mt-4 font-body-md text-caption text-error">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-6 w-full">
        {isSubmitting ? forms('submitting') : t('submit')}
        {isSubmitting ? null : <Icon name="arrow-right" className="h-4 w-4" />}
      </Button>

      <p className="mt-4 flex items-center justify-center gap-2 font-body-md text-caption text-on-surface-variant">
        <Icon name="shield" className="h-4 w-4" />
        {t('privacy')}
      </p>
    </form>
  )
}
