import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Price } from '@/components/ui/Price'
import type { ServiceCardVM, CardFact } from '@/types/services'
import type { CurrencyVM } from '@/types/content'

import { FactIcon } from './FactIcon'

type TourCardProps = {
  item: ServiceCardVM
  basePath: string
  currencies: CurrencyVM[]
  /** Position in the grid. The first row is eager and priority-loaded for LCP. */
  index: number
}

/** Formats a fact's raw value with its translated unit. */
const factText = (fact: CardFact, t: (key: string, values?: Record<string, string>) => string) => {
  switch (fact.label) {
    case 'duration':
      return t('fact.hours', { count: fact.value })
    case 'groupSize':
      return t('fact.maxPeople', { count: fact.value })
    case 'languages':
      return t('fact.languages', { count: fact.value })
    case 'difficulty':
      return t(`difficulty.${fact.value}`)
    default:
      return fact.value
  }
}

/**
 * The daily-tour card: a single-day product, so the reader is scanning for four
 * things — what, how long, how hard, how much. Everything else is subordinate.
 *
 * Structure notes:
 *  - One <article> with one <a> covering the title, and a ::after overlay stretching
 *    that link across the card. This gives a whole-card click target while keeping a
 *    single, meaningfully-labelled link in the accessibility tree — a card wrapped
 *    entirely in an anchor announces its image, badge and price as part of the link
 *    name, which is unusable with a screen reader.
 *  - The card is a flex column with the footer pushed down, so cards in a row align
 *    their prices on a common baseline regardless of title length.
 */
export const TourCard = async ({ item, basePath, currencies, index }: TourCardProps) => {
  const t = await getTranslations('services')
  const facts = (item.facts ?? []).filter((fact) => fact.label !== 'days' && fact.label !== 'nights')
  const duration = facts.find((fact) => fact.label === 'duration')

  return (
    <article
      className="reveal group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest card-lift hover:border-brand/30 hover:shadow-widget focus-within:border-brand/40"
      style={{ '--reveal-index': index } as React.CSSProperties}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-surface-container">
        <CmsImage
          image={item.image}
          alt={item.title}
          sizes="(min-width: 1280px) 380px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          // The first row is above the fold on every breakpoint, so it loads eagerly
          // and one card is flagged as the LCP candidate.
          priority={index === 0}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />

        {/* Scrim only behind the pills, so the image is never dimmed as a whole. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent"
        />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          {item.badge ? (
            <span className="rounded-full bg-brand px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-on-primary shadow-sm">
              {t(`badge.${item.badge}`)}
            </span>
          ) : (
            <span aria-hidden />
          )}

          {duration ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 font-body-md text-caption font-medium text-primary shadow-sm">
              <FactIcon icon="clock" className="h-3.5 w-3.5" />
              {factText(duration, t)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {/*
          Clamped to two lines AND reserving two lines of height, so a one-line title
          and a two-line title occupy the same box. That is what keeps the fact rows
          and prices on a common baseline right across a grid row.
        */}
        <h3 className="line-clamp-2 min-h-[2.6em] font-headline-card text-headline-card leading-[1.3] text-primary transition-colors duration-200 group-hover:text-brand">
          <Link
            href={`${basePath}/${item.slug}`}
            className="focus-card rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {item.title}
          </Link>
        </h3>

        {/* Also height-reserved, for the same reason. */}
        <p className="mt-3 line-clamp-2 min-h-[3.2em] font-body-md text-body-md text-on-surface-variant">
          {item.summary}
        </p>

        {facts.length ? (
          <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {facts.slice(0, 3).map((fact) => (
              <li
                key={fact.label}
                className="inline-flex items-center gap-1.5 font-body-md text-caption text-on-surface-variant"
              >
                <FactIcon icon={fact.icon} className="h-3.5 w-3.5 text-brand/70" />
                <span className="sr-only">{t(`fact.${fact.label}Label`)}: </span>
                {factText(fact, t)}
              </li>
            ))}
          </ul>
        ) : null}

        {/* mt-auto keeps this row on a common baseline across the whole grid row. */}
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <div>
            {item.priceFrom !== null ? (
              <>
                <span className="block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                  {t('from')}
                </span>
                <Price
                  amount={item.priceFrom}
                  currencies={currencies}
                  className="font-headline-card text-headline-card text-primary"
                />
              </>
            ) : (
              <span className="font-body-md text-body-md text-on-surface-variant">
                {t('priceOnRequest')}
              </span>
            )}
          </div>

          {item.rating ? (
            <span className="inline-flex items-center gap-1 font-body-md text-caption text-on-surface-variant">
              <span aria-hidden className="text-brand">
                ★
              </span>
              <span className="sr-only">{t('fact.ratingLabel')}: </span>
              {item.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
