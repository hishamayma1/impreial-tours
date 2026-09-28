'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { loadBookingSummary, type BookingSummaryData } from '@/lib/booking/summary'
import type { CurrencyVM } from '@/types/content'

import { BookingSummary } from './BookingSummary'

/**
 * The confirmation page's receipt.
 *
 * Reads the summary the booking tab saved on submit (see lib/booking/summary). When it
 * is there — the normal case — the customer gets the whole booking laid out for a
 * screenshot. When it is not (the link was opened elsewhere, or later), the page
 * shows the reference alone, which is all a URL can safely prove.
 */
export const ConfirmationSummary = ({
  reference,
  currencies,
}: {
  reference: string
  currencies: CurrencyVM[]
}) => {
  const t = useTranslations('booking.confirmation')
  const summaryT = useTranslations('booking.summary')
  const [summary, setSummary] = useState<BookingSummaryData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSummary(loadBookingSummary(reference))
    setLoaded(true)
  }, [reference])

  if (!loaded) {
    return <div className="h-96 animate-pulse rounded-2xl border border-hairline bg-surface-container-low" />
  }

  const isQuote = summary?.kind === 'quote'

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <p className="mx-auto max-w-lg font-body-md text-body-md text-on-surface-variant">
          {isQuote ? t('quoteNote') : t('emailNote')}
        </p>
      </div>

      {summary ? (
        <>
          <p className="flex items-center justify-center gap-2 rounded-xl border border-brand/25 bg-brand/[0.05] px-4 py-3 text-center font-body-md text-caption text-primary print:hidden">
            <Icon name="sparkle" className="h-4 w-4 shrink-0 text-brand" />
            {summaryT('screenshotHint')}
          </p>

          <BookingSummary data={summary} currencies={currencies} mode="receipt" />
        </>
      ) : (
        <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-10 text-center">
          <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            {t('reference')}
          </p>
          <p className="mt-3 font-headline-section text-headline-section text-primary">{reference}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        {summary?.whatsappUrl ? (
          <a
            href={summary.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 font-body-md font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <Icon name="whatsapp" className="h-4 w-4" />
            {summaryT('continueWhatsapp')}
          </a>
        ) : null}
        {summary ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-brand px-6 py-3.5 font-body-md font-medium text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {summaryT('print')}
          </button>
        ) : null}
        <ButtonLink href="/" variant="navy" size="lg">
          {t('backHome')}
        </ButtonLink>
      </div>
    </div>
  )
}
