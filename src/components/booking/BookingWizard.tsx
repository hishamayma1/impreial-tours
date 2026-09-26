'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { Button, ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { todayISO } from '@/lib/date'
import { estimateBooking } from '@/lib/booking/estimate'
import { validateContact, validateDetails, type StepErrors } from '@/lib/booking/validate'
import { useBookingStore, TOTAL_STEPS, formatPrice, usePreferencesStore } from '@/stores'
import type { ServiceType } from '@/stores/booking-store'
import type { CurrencyVM } from '@/types/content'
import { cn } from '@/lib/utils'

import { useLineLabel } from './BookingSummary'

/**
 * Steps are code-split and loaded on demand: a visitor on step 1 should not pay to
 * download the review step's summary or the contact step's field set. ssr:false is
 * deliberate — the wizard renders a skeleton until its sessionStorage state hydrates
 * anyway, so there is no server markup to preserve.
 */
const DetailsStep = dynamic(() => import('./DetailsStep').then((m) => m.DetailsStep), {
  ssr: false,
  loading: () => <StepFallback />,
})
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

/** Which basket each checkout URL accepts, and where to send a visitor with none. */
const ROUTES: Record<string, { accepts: ServiceType[]; browse: string }> = {
  tour: { accepts: ['dailyTour', 'experience'], browse: '/tours' },
  hotel: { accepts: ['hotel'], browse: '/hotels' },
  bike: { accepts: ['bicycle'], browse: '/bicycles' },
  // Transfers book inline on their own pages; this route only ever redirects there.
  car: { accepts: [], browse: '/transfers' },
}

type BookingWizardProps = {
  serviceType: string
  currencies: CurrencyVM[]
}

/**
 * The checkout shell: step chrome, the running total, and validated navigation
 * between steps.
 *
 * "Continue" validates the step it is leaving. It used to advance unconditionally,
 * so a visitor could reach "Confirm" with no date or no email and only learn at the
 * last click — from a generic server error — that something was missing.
 */
export const BookingWizard = ({ serviceType, currencies }: BookingWizardProps) => {
  const t = useTranslations('booking')
  const locale = useLocale()
  const lineLabel = useLineLabel()

  const currentStep = useBookingStore((state) => state.currentStep)
  const hydrated = useBookingStore((state) => state.hydrated)
  const { nextStep, prevStep, goToStep } = useBookingStore(
    useShallow((state) => ({
      nextStep: state.nextStep,
      prevStep: state.prevStep,
      goToStep: state.goToStep,
    })),
  )

  // Everything the estimate and validation read. Subscribed as one shallow slice so
  // the summary and the step's error messages stay live as the visitor edits.
  const basket = useBookingStore(
    useShallow((state) => ({
      serviceType: state.serviceType,
      itemSnapshot: state.itemSnapshot,
      dates: state.dates,
      travelers: state.travelers,
      hotelSelection: state.hotelSelection,
      transferDetails: state.transferDetails,
      bicycleSelection: state.bicycleSelection,
      tourOptions: state.tourOptions,
      extras: state.extras,
      contact: state.contact,
    })),
  )

  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  const money = (amount: number) => formatPrice(amount, currency, locale)

  // Errors show only once the visitor has tried to leave the step, not while typing.
  const [attempted, setAttempted] = useState<number | null>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const estimate = useMemo(() => estimateBooking(basket), [basket])

  const errorsFor = (step: number): StepErrors =>
    step === 0
      ? validateDetails(basket, todayISO())
      : step === 1
        ? validateContact(basket.contact)
        : {}

  const stepErrors = attempted === currentStep ? errorsFor(currentStep) : {}

  // Scroll to the top of each step so a long hotel form does not open mid-page.
  useEffect(() => {
    if (mounted) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep, mounted])

  if (!mounted || !hydrated) {
    return (
      <Container className="py-20">
        <div className="h-64 animate-pulse rounded-xl border border-hairline bg-surface-container-low" />
      </Container>
    )
  }

  const route = ROUTES[serviceType] ?? ROUTES.tour
  const snapshot = basket.itemSnapshot
  const matches =
    !!snapshot?.pricing && !!basket.serviceType && route.accepts.includes(basket.serviceType)

  // A checkout with nothing in it — opened directly, after a refresh in a new tab, or
  // after the booking was already sent — says so and points back to the catalogue,
  // instead of rendering a form that can only fail on submit.
  if (!matches) {
    return (
      <Container size="narrow" className="py-16 md:py-24">
        <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-10 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
            <Icon name="compass" className="h-6 w-6" />
          </span>
          <h2 className="font-headline-card text-headline-card text-primary">{t('empty.title')}</h2>
          <p className="mx-auto mt-3 max-w-md font-body-md text-body-md text-on-surface-variant">
            {t(serviceType === 'car' ? 'empty.transferBody' : 'empty.body')}
          </p>
          <ButtonLink href={route.browse} variant="navy" size="lg" className="mt-8">
            {t(`empty.cta.${serviceType in ROUTES ? serviceType : 'tour'}`)}
          </ButtonLink>
        </div>
      </Container>
    )
  }

  const steps = [t('steps.details'), t('steps.contact'), t('steps.review')]

  const onContinue = () => {
    const errors = errorsFor(currentStep)
    if (Object.keys(errors).length) {
      setAttempted(currentStep)
      // Bring the first problem into view — on a phone it is often off-screen.
      requestAnimationFrame(() =>
        document
          .querySelector('[data-field-error]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    setAttempted(null)
    nextStep()
  }

  /** A completed step can be revisited from the progress bar; later ones cannot. */
  const canJumpTo = (index: number) => index < currentStep

  const needsDate = !basket.dates.start

  return (
    <Container className="py-12 md:py-16">
      <ol className="mb-10 flex flex-wrap gap-3" aria-label={t('title')}>
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              disabled={!canJumpTo(index)}
              onClick={() => goToStep(index)}
              aria-current={index === currentStep ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-2 font-body-md text-caption transition-colors',
                'disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                index === currentStep
                  ? 'border-brand bg-brand text-on-primary'
                  : index < currentStep
                    ? 'border-brand text-brand hover:bg-brand/[0.06]'
                    : 'border-hairline text-on-surface-variant',
              )}
            >
              {index < currentStep ? (
                <Icon name="check" className="h-3.5 w-3.5" />
              ) : (
                <span aria-hidden>{index + 1}</span>
              )}
              {label}
            </button>
          </li>
        ))}
      </ol>

      {/* Every service is held against a date, so every step repeats the reminder
          until one is chosen — a visitor can reach contact or review with an
          incomplete selection by going back and forth. */}
      {needsDate ? (
        <div
          role="status"
          className="mb-8 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/[0.06] px-4 py-3.5 text-primary"
        >
          <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="font-body-md text-caption">{t('dateRequiredNotice.pending')}</p>
        </div>
      ) : null}

      {attempted === currentStep && Object.keys(stepErrors).length ? (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-error/30 bg-error/5 p-3 font-body-md text-body-md text-error"
        >
          {t('errors.fixBelow')}
        </p>
      ) : null}

      <div className="grid gap-grid-gutter lg:grid-cols-[1fr_22rem]">
        <div>
          {currentStep === 0 ? <DetailsStep errors={stepErrors} currencies={currencies} /> : null}
          {currentStep === 1 ? <ContactStep errors={stepErrors} /> : null}
          {currentStep === 2 ? <ReviewStep currencies={currencies} /> : null}
        </div>

        <aside className="h-fit overflow-hidden rounded-xl border border-hairline bg-surface-container-low lg:sticky lg:top-28">
          {snapshot?.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- a CMS URL of unknown size, shown small
            <img src={snapshot.image} alt="" className="h-36 w-full object-cover" />
          ) : null}
          <div className="p-6">
            <p className="font-label-caps text-label-caps uppercase tracking-[0.14em] text-brand">
              {snapshot?.pricing ? t(`serviceNames.${snapshot.pricing.kind}`) : ''}
            </p>
            <h2 className="mt-1 font-headline-card text-headline-card text-primary">
              {snapshot?.label || t('title')}
            </h2>

            {estimate.lines.length ? (
              <ul className="mt-5 space-y-2 border-t border-hairline pt-4">
                {estimate.lines.map((line, index) => (
                  <li
                    key={`${line.label}-${index}`}
                    className="flex items-baseline justify-between gap-3 font-body-md text-caption"
                  >
                    <span className="text-on-surface-variant">
                      {lineLabel(line.label)}
                      {line.quantity > 1 ? ` × ${line.quantity}` : ''}
                    </span>
                    <span className="shrink-0 tabular-nums text-primary">{money(line.subtotal)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <dl className="mt-4 border-t border-hairline pt-4">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-body-md text-body-md text-on-surface-variant">
                  {t('estimatedTotal')}
                </dt>
                <dd className="font-headline-card text-headline-card tabular-nums text-primary">
                  {estimate.lines.length ? money(estimate.subtotal) : '—'}
                </dd>
              </div>
            </dl>

            <p className="mt-3 font-body-md text-caption text-on-surface-variant">
              {t('estimateNote')}
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-hairline pt-6">
        <Button
          type="button"
          variant="outlineNavy"
          onClick={() => {
            setAttempted(null)
            prevStep()
          }}
          disabled={currentStep === 0}
        >
          {t('back')}
        </Button>

        {currentStep < TOTAL_STEPS - 1 ? (
          <Button type="button" variant="navy" onClick={onContinue}>
            {t('continue')}
          </Button>
        ) : null}
      </div>
    </Container>
  )
}
