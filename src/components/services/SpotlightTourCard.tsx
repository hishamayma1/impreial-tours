import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Price } from '@/components/ui/Price'
import type { CardFact, SpotlightTourVM } from '@/types/services'
import type { CurrencyVM } from '@/types/content'

import { FactIcon } from './FactIcon'

type SpotlightTourCardProps = {
  item: SpotlightTourVM
  currencies: CurrencyVM[]
  /** Position in the grid, used to stagger the scroll reveal. */
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
 * The spotlight card — a third card style, for the home page band only.
 *
 * The listing cards are white panels below a photo, tuned for scanning twelve results
 * against each other. This band is doing the opposite job: six hand-picked tours on a
 * navy field, meant to be looked at rather than compared. So the photo is the whole
 * card and the copy sits on it, inside a frosted panel that rises on hover to uncover
 * the summary underneath. Portrait rather than landscape, because a 4:5 crop of a
 * temple or a felucca holds a person's eye where a 3:2 strip does not.
 *
 * Structure follows TourCard's: one <article>, one link on the title, and a ::after
 * overlay stretching that link across the card. A card wrapped entirely in an anchor
 * announces its photo, ribbon, rating and price as one run-on link name, which is
 * unusable with a screen reader.
 */
export const SpotlightTourCard = async ({ item, currencies, index }: SpotlightTourCardProps) => {
  const [t, ts] = await Promise.all([
    getTranslations('topTours'),
    getTranslations('services'),
  ])

  /**
   * Three facts, in the order that matters for the product being shown: a day tour is
   * chosen on how long it takes, a multi-day experience on how many days and nights.
   */
  const facts = (item.facts ?? []).filter((fact) =>
    item.tourType === 'experience'
      ? fact.label !== 'duration'
      : fact.label !== 'days' && fact.label !== 'nights',
  )

  return (
    <article
      className="reveal group relative isolate flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-brand-dark card-lift hover:border-white/25 hover:shadow-widget focus-within:border-white/40"
      style={{ '--reveal-index': index } as React.CSSProperties}
    >
      {/* The photo is the card. Everything else is drawn over it. */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <CmsImage
          image={item.image}
          alt=""
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 45vw, 92vw"
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
        />

        {/*
          Two stops rather than one: a near-opaque foot so the panel's text always has
          a dark field under it whatever an editor uploads, and a light wash at the top
          so the ribbon and rating stay legible over a bright sky.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/35 via-45% to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent"
        />

        <div className="absolute inset-x-5 top-5 flex items-start justify-between gap-3">
          {/*
            The ribbon states why this tour is in the band. 'new' and 'top' are the
            band's own grouping, so the two tones are fixed here rather than read from
            the CMS badge — which an editor may have left on something else entirely.
          */}
          <span
            className={
              item.spotlight === 'top'
                ? 'inline-flex items-center gap-1.5 rounded-full bg-tertiary-fixed px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-on-tertiary-fixed shadow-sm'
                : 'inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-brand shadow-sm'
            }
          >
            {item.spotlight === 'top' ? <span aria-hidden>★</span> : null}
            {t(`ribbon.${item.spotlight}`)}
          </span>

          {item.rating ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/25 px-2.5 py-1.5 font-body-md text-caption font-medium text-white backdrop-blur-md">
              <span aria-hidden className="text-tertiary-fixed-dim">
                ★
              </span>
              <span className="sr-only">{ts('fact.ratingLabel')}: </span>
              {item.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        {/*
          The frosted panel. `translate-y` on hover lifts it just far enough to expose
          the summary that is clipped below it at rest — the detail is there for anyone
          who slows down on a card, and costs no height for everyone who does not.
          Transform and opacity only, so the whole interaction stays on the compositor.
        */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="rounded-[20px] border border-white/15 bg-white/10 p-5 backdrop-blur-xl transition-colors duration-300 group-hover:bg-white/[0.18]">
            <h3 className="line-clamp-2 font-headline-card text-headline-card leading-snug text-white">
              <Link
                href={item.href}
                className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark"
              >
                {item.title}
              </Link>
            </h3>

            {facts.length ? (
              <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {facts.slice(0, 3).map((fact) => (
                  <li
                    key={fact.label}
                    className="inline-flex items-center gap-1.5 font-body-md text-caption text-white/75"
                  >
                    <FactIcon icon={fact.icon} className="h-3.5 w-3.5 text-tertiary-fixed-dim" />
                    <span className="sr-only">{ts(`fact.${fact.label}Label`)}: </span>
                    {factText(fact, ts)}
                  </li>
                ))}
              </ul>
            ) : null}

            {/*
              Collapsed to nothing at rest and opened on hover or keyboard focus. The
              grid-rows trick animates to the text's real height without hard-coding
              one, and `invisible` keeps the clipped copy out of the tab order and off
              the screen-reader's path while it is closed.
            */}
            {item.summary ? (
              <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-out group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
                <p className="invisible overflow-hidden font-body-md text-caption leading-relaxed text-white/70 opacity-0 transition-[opacity,visibility] duration-300 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <span className="mt-3 block line-clamp-3">{item.summary}</span>
                </p>
              </div>
            ) : null}

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/15 pt-4">
              <div>
                {item.priceFrom !== null ? (
                  <>
                    <span className="block font-label-caps text-label-caps uppercase tracking-widest text-white/55">
                      {ts('from')}
                    </span>
                    <span className="flex items-baseline gap-1.5">
                      <Price
                        amount={item.priceFrom}
                        currencies={currencies}
                        className="font-headline-card text-headline-card text-white"
                      />
                      <span className="font-body-md text-caption text-white/60">
                        {ts('perPersonShort')}
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="font-body-md text-body-md text-white/80">
                    {ts('priceOnRequest')}
                  </span>
                )}
              </div>

              {/* Decorative: the title link above is the card's one real link. */}
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors duration-300 group-hover:border-white group-hover:bg-white group-hover:text-brand"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
