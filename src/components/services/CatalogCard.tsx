import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Price } from '@/components/ui/Price'
import { cn } from '@/lib/utils'
import type { CatalogTourVM, CardFact } from '@/types/services'
import type { CurrencyVM } from '@/types/content'

import { FactIcon } from './FactIcon'

type CatalogCardProps = {
  item: CatalogTourVM
  currencies: CurrencyVM[]
  /** Position in the grid. The first row is eager and priority-loaded for LCP. */
  index: number
}

/** Formats a fact's raw value with its translated unit. */
const factText = (fact: CardFact, t: (key: string, values?: Record<string, string>) => string) => {
  switch (fact.label) {
    case 'duration':
      return t('fact.hours', { count: fact.value })
    case 'days':
      return t('fact.daysValue', { count: fact.value })
    case 'nights':
      return t('fact.nightsValue', { count: fact.value })
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
 * A catalogue card, serving both a day tour and a two-week experience.
 *
 * The two products are genuinely different — one is an afternoon, the other is a
 * fortnight with accommodation — but in a mixed grid they have to be comparable at a
 * glance, so the card commits to one shape and lets the *content* carry the
 * difference: the type is stated outright in a pill, and the fact row underneath
 * fills with hours or with days and nights depending on which the tour has.
 *
 * Structure notes:
 *  - One `<article>` with one `<a>` over the title, and an `::after` overlay
 *    stretching that link across the card. That gives a whole-card click target while
 *    keeping a single, meaningfully-named link in the accessibility tree — a card
 *    wrapped entirely in an anchor announces its image, pills and price as part of the
 *    link name, which is unusable with a screen reader.
 *  - Flex column with the price row pushed down by `mt-auto`, and both the title and
 *    the summary height-reserved, so every card in a row aligns on a common baseline
 *    however long its title runs.
 */
export const CatalogCard = async ({ item, currencies, index }: CatalogCardProps) => {
  const [t, c] = await Promise.all([getTranslations('services'), getTranslations('catalog')])

  const facts = item.facts ?? []
  // Duration rides in the image overlay, so it is not repeated in the row below.
  const overlayFact = facts.find((fact) => fact.label === 'duration' || fact.label === 'days')
  const rowFacts = facts.filter((fact) => fact !== overlayFact).slice(0, 3)

  return (
    <article
      className="reveal group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest card-lift hover:border-brand/30 hover:shadow-widget focus-within:border-brand/40"
      style={{ '--reveal-index': index } as React.CSSProperties}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-surface-container">
        <CmsImage
          image={item.image}
          alt={item.title}
          sizes="(min-width: 1536px) 400px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          // The first row is above the fold at every breakpoint, so it loads eagerly
          // and the first card is flagged as the LCP candidate.
          priority={index === 0}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />

        {/* Scrim only behind the pills, so the photograph is never dimmed as a whole. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent"
        />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          <span
            className={cn(
              'rounded-full px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest shadow-sm',
              // Experiences wear the brand navy, day tours a light pill: in a mixed
              // grid the eye can then sort the two kinds without reading a word.
              item.tourType === 'experience'
                ? 'bg-brand text-on-primary'
                : 'bg-white/95 text-primary',
            )}
          >
            {item.tourType === 'experience' ? c('badgeExperience') : c('badgeDaily')}
          </span>

          {overlayFact ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 font-body-md text-caption font-medium text-primary shadow-sm">
              <FactIcon icon={overlayFact.icon} className="h-3.5 w-3.5" />
              {factText(overlayFact, t)}
            </span>
          ) : null}
        </div>

        {item.badge ? (
          <span className="absolute bottom-4 start-4 rounded-full bg-surface-container-lowest/95 px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-brand shadow-sm">
            {t(`badge.${item.badge}`)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        {/*
          Clamped to two lines AND reserving two lines of height, so a one-line title
          and a two-line title occupy the same box. That is what keeps the fact rows
          and the prices on a common baseline right across a grid row.
        */}
        <h3 className="line-clamp-2 min-h-[2.6em] font-headline-card text-headline-card leading-[1.3] text-primary transition-colors duration-200 group-hover:text-brand">
          <Link
            href={item.href}
            className="focus-card rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {item.title}
          </Link>
        </h3>

        {/* Also height-reserved, for the same reason. */}
        <p className="mt-3 line-clamp-2 min-h-[3.2em] font-body-md text-body-md text-on-surface-variant">
          {item.summary}
        </p>

        {rowFacts.length ? (
          <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {rowFacts.map((fact) => (
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
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-hairline/70 pt-5">
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
