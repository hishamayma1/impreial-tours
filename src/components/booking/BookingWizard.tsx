'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBookingStore, selectEstimatedTotal, TOTAL_STEPS } from '@/stores'
import { formatPrice, usePreferencesStore } from '@/stores'
import type { CurrencyVM } from '@/types/content'
import { cn } from '@/lib/utils'

/**
 * Steps are code-split and loaded on demand: a visitor on step 1 should not pay to
 * download the review step's currency formatting or the contact step's field set.
 * ssr:false is deliberate — the wizard renders a skeleton until its sessionStorage
 * state hydrates anyway, so there is no server markup to preserve.
 */
const TravellersStep = dynamic(
  () => import('./TravellersStep').then((m) => m.TravellersStep),
  { ssr: false, loading: () => <StepFallback /> },
)
const ContactStep = dynamic(() => import('./ContactStep').then((m) => m.ContactStep), {
  ssr: false,
  loading: () => <StepFallback />,
})
const ReviewStep = dynamic(() => import('./ReviewStep').then((m) => m.ReviewStep), {
  ssr: false,
  loading: () => <StepFallback />,
})

/** Holds the step's height so advancing does not collapse the layout mid-transition. */
const StepFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-7 w-40" />
    <Skeleton className="h-[42px] w-full" />
    <Skeleton className="h-[42px] w-full" />
    <Skeleton className="h-[42px] w-2/3" />
  </div>
)

type BookingWizardProps = {
  serviceType: string
  currencies: CurrencyVM[]
}

/**
 * The checkout shell: step chrome, the running total, and navigation between steps.
 *
 * Every subscription uses a narrow selector (and `useShallow` where several values are
 * read at once) so a keystroke in the contact form does not re-render the whole
 * wizard — Section 6's performance rules.
 */
export const BookingWizard = ({ serviceType, currencies }: BookingWizardProps) => {
  const t = useTranslations('booking')
  const locale = useLocale()

  const currentStep = useBookingStore((state) => state.currentStep)
  const hydrated = useBookingStore((state) => state.hydrated)
  const total = useBookingStore(selectEstimatedTotal)
  const snapshot = useBookingStore((state) => state.itemSnapshot)
  const { nextStep, prevStep } = useBookingStore(
    useShallow((state) => ({ nextStep: state.nextStep, prevStep: state.prevStep })),
  )

  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]

  // Persisted state lives in sessionStorage, which the server cannot see. Rendering the
  // same skeleton on both sides until hydration avoids a mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !hydrated) {
    return (
      <Container className="py-20">
        <div className="h-64 animate-pulse rounded-xl border border-hairline bg-surface-container-low" />
      </Container>
    )
  }

  const steps = [t('steps.details'), t('steps.contact'), t('steps.review')]

  return (
    <Container className="py-12 md:py-16">
      <ol className="mb-10 flex flex-wrap gap-3" aria-label={t('title')}>
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === currentStep ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 font-body-md text-caption transition-colors',
              index === currentStep
                ? 'border-brand bg-brand text-on-primary'
                : index < currentStep
                  ? 'border-brand text-brand'
                  : 'border-hairline text-on-surface-variant',
            )}
          >
            <span aria-hidden>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className="grid gap-grid-gutter lg:grid-cols-[1fr_20rem]">
        <div>
          {currentStep === 0 ? <TravellersStep serviceType={serviceType} /> : null}
          {currentStep === 1 ? <ContactStep /> : null}
          {currentStep === 2 ? <ReviewStep currencies={currencies} /> : null}
        </div>

        <aside className="h-fit rounded-xl border border-hairline bg-surface-container-low p-6 lg:sticky lg:top-28">
          <h2 className="font-headline-card text-headline-card text-primary">
            {snapshot?.label || t('title')}
          </h2>

          <dl className="mt-6 border-t border-hairline pt-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-body-md text-body-md text-on-surface-variant">
                {t('estimatedTotal')}
              </dt>
              <dd className="font-headline-card text-headline-card text-primary">
                {formatPrice(total, currency, locale)}
              </dd>
            </div>
          </dl>

          {/* The customer must know this figure is indicative — the server prices the
              booking for real on submit. */}
          <p className="mt-3 font-body-md text-caption text-on-surface-variant">
            {t('estimateNote')}
          </p>
        </aside>
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-hairline pt-6">
        <Button
          type="button"
          variant="outlineNavy"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          {t('back')}
        </Button>

        {currentStep < TOTAL_STEPS - 1 ? (
          <Button type="button" variant="navy" onClick={nextStep}>
            {t('continue')}
          </Button>
        ) : null}
      </div>
    </Container>
  )
}
