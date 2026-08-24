'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { useRouter } from '@/i18n/navigation'
import { useBookingStore, selectEstimatedTotal, formatPrice, usePreferencesStore } from '@/stores'
import type { CurrencyVM } from '@/types/content'

export const ReviewStep = ({ currencies }: { currencies: CurrencyVM[] }) => {
  const t = useTranslations('booking')
  const forms = useTranslations('forms')
  const locale = useLocale()
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = useBookingStore(selectEstimatedTotal)
  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]

  const submit = async () => {
    setSubmitting(true)
    setError(null)

    // The whole store is read once, at submit time only — deliberately not subscribed
    // to, so typing in earlier steps never re-renders this component.
    const state = useBookingStore.getState()

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: state.serviceType,
          itemId: state.itemId,
          slug: state.itemSnapshot?.slug,
          locale,
          dates: state.dates,
          travelers: state.travelers,
          hotelSelection: state.hotelSelection,
          transferDetails: state.transferDetails,
          bicycleSelection: state.bicycleSelection,
          contact: state.contact,
          // No prices are sent: the server recomputes them from the CMS.
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error === 'validation' ? forms('required') : forms('genericError'))
        return
      }

      useBookingStore.getState().reset()
      router.push(`/booking/confirmation/${result.bookingReference}`)
    } catch {
      setError(forms('genericError'))
    } finally {
      setSubmitting(false)
    }
  }

  const state = useBookingStore.getState()

  return (
    <section>
      <h2 className="mb-6 font-headline-card text-headline-card text-primary">
        {t('steps.review')}
      </h2>

      <dl className="divide-y divide-hairline border-y border-hairline">
        <Row label={t('fields.firstName')} value={`${state.contact.firstName} ${state.contact.lastName}`.trim()} />
        <Row label={t('fields.email')} value={state.contact.email} />
        <Row label={t('startDate')} value={state.dates.start ?? ''} />
        {state.dates.end ? <Row label={t('endDate')} value={state.dates.end} /> : null}
        <Row
          label={t('travellers')}
          value={`${state.travelers.adults} + ${state.travelers.children}`}
        />
        <Row label={t('estimatedTotal')} value={formatPrice(total, currency, locale)} />
      </dl>

      <p className="mt-4 font-body-md text-caption text-on-surface-variant">
        {t('estimateNote')}
      </p>

      {error ? (
        <p role="alert" className="mt-4 font-body-md text-body-md text-error">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="navy"
        size="lg"
        className="mt-8"
        onClick={submit}
        disabled={submitting}
      >
        {submitting ? forms('submitting') : t('confirm')}
      </Button>
    </section>
  )
}

const Row = ({ label, value }: { label: string; value: string }) =>
  value ? (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="font-body-md text-body-md text-on-surface-variant">{label}</dt>
      <dd className="font-body-md text-body-md text-primary">{value}</dd>
    </div>
  ) : null
