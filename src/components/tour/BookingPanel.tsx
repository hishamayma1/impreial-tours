import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { FactIcon } from '@/components/services/FactIcon'
import type { CurrencyVM } from '@/types/content'

type PanelFact = {
  icon: 'clock' | 'calendar' | 'signal' | 'users' | 'globe' | 'moon'
  label: string
  value: string
}

type BookingPanelProps = {
  price: number | null
  /** Shown under the price, e.g. "per person". */
  priceNote: string
  secondaryPrice?: { label: string; amount: number } | null
  facts: PanelFact[]
  href: string
  currencies: CurrencyVM[]
  instantConfirmation?: boolean
  departures?: string[]
}

/**
 * The price and booking card.
 *
 * Sticky on desktop so the price and the call to action stay reachable through a long
 * itinerary — on a page this tall, a CTA that only exists at the bottom asks the
 * reader to scroll back up to act. `top-28` clears the header and section nav.
 *
 * On mobile it is not sticky: a fixed card would eat a third of a small screen. It
 * sits directly under the hero instead, where it is seen before the reader commits to
 * scrolling, and repeats at the end of the page.
 */
export const BookingPanel = async ({
  price,
  priceNote,
  secondaryPrice,
  facts,
  href,
  currencies,
  instantConfirmation,
  departures = [],
}: BookingPanelProps) => {
  const t = await getTranslations('services')

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-widget">
        <div className="border-b border-hairline p-6">
          {price !== null ? (
            <>
              <span className="block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                {t('from')}
              </span>
              <p className="mt-1 flex items-baseline gap-2">
                <Price
                  amount={price}
                  currencies={currencies}
                  className="font-display-hero text-headline-section text-primary"
                />
                <span className="font-body-md text-caption text-on-surface-variant">
                  {priceNote}
                </span>
              </p>
              {secondaryPrice ? (
                <p className="mt-2 font-body-md text-caption text-on-surface-variant">
                  {secondaryPrice.label}{' '}
                  <Price amount={secondaryPrice.amount} currencies={currencies} />
                </p>
              ) : null}
            </>
          ) : (
            <p className="font-headline-card text-headline-card text-primary">
              {t('priceOnRequest')}
            </p>
          )}

          {instantConfirmation ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand/8 px-3 py-1.5 font-body-md text-caption text-brand">
              <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
                <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('instantConfirmation')}
            </p>
          ) : null}
        </div>

        {facts.length ? (
          <dl className="divide-y divide-hairline">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-center justify-between gap-4 px-6 py-3.5">
                <dt className="inline-flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                  <FactIcon icon={fact.icon} className="h-4 w-4 text-brand/70" />
                  {fact.label}
                </dt>
                <dd className="text-right font-body-md text-body-md font-medium text-primary">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {departures.length ? (
          <div className="border-t border-hairline px-6 py-4">
            <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              {t('startTimes')}
            </p>
            <ul className="flex flex-wrap gap-2">
              {departures.map((time) => (
                <li
                  key={time}
                  className="rounded-lg border border-hairline px-2.5 py-1 font-body-md text-caption text-primary"
                >
                  {time}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="p-6 pt-5">
          <ButtonLink href={href} variant="navy" size="lg" className="w-full justify-center">
            {t('bookNow')}
          </ButtonLink>
        </div>
      </div>
    </aside>
  )
}
