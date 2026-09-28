'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Icon } from '@/components/ui/Icon'
import type { BookingSummaryData } from '@/lib/booking/summary'
import type { PriceLine } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { formatPrice, usePreferencesStore } from '@/stores'
import type { CurrencyVM } from '@/types/content'

/**
 * Price-line labels come from lib/pricing in English, because the server writes them
 * onto the booking record that staff read. The customer's copy translates the ones it
 * recognises and passes anything else (room names, vehicle classes, add-ons — which
 * are already the CMS's localised text) through untouched.
 */
const LINE_KEYS: Record<string, string> = {
  Adults: 'adults',
  Children: 'children',
  Travellers: 'travellers',
  Riders: 'riders',
  'Single supplement': 'singleSupplement',
  'Weekend surcharge': 'weekendSurcharge',
  Delivery: 'delivery',
  'Private group': 'privateGroup',
}

export const useLineLabel = () => {
  const t = useTranslations('booking.lines')
  const s = useTranslations('services')
  return (label: string) => {
    if (LINE_KEYS[label]) return t(LINE_KEYS[label])
    // "Deluxe — double" → the occupancy word translated.
    return label
      .replace(/ — (single|double|triple)$/, (_, occ: string) => ` — ${s(occ)}`)
      .replace(/ \(round trip\)$/, ` (${t('roundTrip')})`)
  }
}

type SummaryProps = {
  data: Omit<BookingSummaryData, 'reference' | 'createdAt'> & {
    reference?: string
    createdAt?: string
  }
  currencies: CurrencyVM[]
  /** `review` before submitting; `receipt` on the confirmation page. */
  mode: 'review' | 'receipt'
}

/**
 * The booking at a glance — what, when, who, and the price line by line.
 *
 * One component for both sides of the submit button, so the summary the visitor
 * confirms and the receipt they screenshot afterwards are laid out identically and a
 * customer comparing the two sees the same rows in the same order.
 */
export const BookingSummary = ({ data, currencies, mode }: SummaryProps) => {
  const t = useTranslations('booking.summary')
  const locale = useLocale()
  const lineLabel = useLineLabel()

  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  const money = (amount: number) => formatPrice(amount, currency, locale)
  const usd = currencies.find((c) => c.code === 'USD')
  const showUsd = currency && currency.code !== 'USD' && data.total !== null

  const receipt = mode === 'receipt'

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-surface-container-lowest',
        receipt ? 'border-brand/30 shadow-widget' : 'border-hairline',
      )}
    >
      {/* --- header ----------------------------------------------------------- */}
      <header className="border-b border-hairline bg-surface-container-low px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-label-caps text-label-caps uppercase tracking-[0.14em] text-brand">
              Imperial Tours · {data.serviceLabel}
            </p>
            <h3 className="mt-1 font-headline-card text-headline-card text-primary">
              {data.itemLabel}
            </h3>
          </div>
          {receipt ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.07] px-3 py-1 font-body-md text-caption text-brand">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {data.kind === 'quote' ? t('statusQuote') : t('statusPending')}
            </span>
          ) : null}
        </div>

        {data.reference ? (
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                {data.kind === 'quote' ? t('quoteReference') : t('reference')}
              </p>
              <p className="font-headline-section text-headline-card tracking-wider text-primary sm:text-headline-section">
                {data.reference}
              </p>
            </div>
            {data.createdAt ? (
              <p className="font-body-md text-caption text-on-surface-variant">
                {t('submittedOn', {
                  date: new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(data.createdAt)),
                })}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* --- details ---------------------------------------------------------- */}
      <dl className="divide-y divide-hairline px-5 sm:px-6">
        {data.rows
          .filter((row) => row.value)
          .map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="shrink-0 font-body-md text-body-md text-on-surface-variant">{row.label}</dt>
              <dd className="text-end font-body-md text-body-md text-primary">{row.value}</dd>
            </div>
          ))}
      </dl>

      {/* --- guest ------------------------------------------------------------ */}
      {data.contact.name || data.contact.email ? (
        <div className="border-t border-hairline px-5 py-4 sm:px-6">
          <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            {t('leadGuest')}
          </p>
          <p className="font-body-md text-body-md text-primary">{data.contact.name}</p>
          <p className="font-body-md text-caption text-on-surface-variant">
            {[data.contact.email, data.contact.phone].filter(Boolean).join(' · ')}
          </p>
        </div>
      ) : null}

      {/* --- price ------------------------------------------------------------ */}
      <div className="border-t border-hairline bg-surface-container-low px-5 py-5 sm:px-6">
        {data.lines.length ? (
          <>
            <p className="mb-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              {t('priceBreakdown')}
            </p>
            <ul className="space-y-2">
              {data.lines.map((line: PriceLine, index) => (
                <li
                  key={`${line.label}-${index}`}
                  className="flex items-baseline justify-between gap-4 font-body-md text-body-md"
                >
                  <span className="text-on-surface-variant">
                    {lineLabel(line.label)}
                    {line.quantity > 1 ? (
                      <span className="text-outline">
                        {' '}
                        · {line.quantity} × {money(line.unitPrice)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-primary">{money(line.subtotal)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {data.total !== null ? (
          <div
            className={cn(
              'flex items-baseline justify-between gap-4',
              data.lines.length && 'mt-4 border-t border-hairline pt-4',
            )}
          >
            <span className="font-body-md text-body-md font-medium text-primary">
              {receipt ? t('total') : t('estimatedTotal')}
            </span>
            <span className="text-end">
              <span className="block font-headline-card text-headline-card tabular-nums text-primary">
                {money(data.total)}
              </span>
              {showUsd ? (
                <span className="block font-body-md text-caption text-on-surface-variant">
                  {t('recordedIn', { amount: formatPrice(data.total, usd, locale) })}
                </span>
              ) : null}
            </span>
          </div>
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant">{t('priceToFollow')}</p>
        )}

        <p className="mt-3 font-body-md text-caption text-on-surface-variant">
          {receipt ? t('paymentNote') : t('estimateNote')}
        </p>
      </div>
    </article>
  )
}
