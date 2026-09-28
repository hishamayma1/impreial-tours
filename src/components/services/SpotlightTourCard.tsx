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
      {/*
        The photo is the card. Everything else is drawn over it. Taller on phones
        (3:4), where the card is a single swipeable column and the photo has to do the
        selling on its own; 4:5 from `md`, where three sit side by side.
      */}
      <div className="relative aspect-[3/4] w-full overflow-hidden md:aspect-[4/5]">
        <CmsImage
          image={item.image}
          alt=""
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 45vw, 92vw"
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
        />

        {/*
          Two stops rather than one: a near-opaque foot so the panel's text always has
          a dark field under it whatever an editor uploads, and a light wash at the top
          so the ribbon and rating stay legible over a bright sky. Shallower on phones,
          where the copy is down to two short lines at the foot and the upper two-thirds
          of the photo can be left clear.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/25 via-35% to-transparent md:via-brand-dark/35 md:via-45%"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent"
        />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3 md:inset-x-5 md:top-5">
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
        {/*
          Below `md` the copy is cut to what a thumb-scroller decides on — title, one
          fact, price — and set straight onto the photo's dark foot rather than into
          the frosted panel. The panel with all of its content stood about half the
          card's height on a phone, covering the photograph the card exists to show.
          From `md` the frosted panel and its full content return.
        */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
          <div className="transition-colors duration-300 md:rounded-[20px] md:border md:border-white/15 md:bg-white/10 md:p-5 md:backdrop-blur-xl md:group-hover:bg-white/[0.18]">
            <h3 className="line-clamp-2 font-headline-card text-xl leading-snug text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)] md:text-headline-card md:[text-shadow:none]">
              <Link
                href={item.href}
                className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark"
              >
                {item.title}
              </Link>
            </h3>

            {facts.length ? (
              <ul className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 md:mt-3">
                {facts.slice(0, 3).map((fact, factIndex) => (
                  <li
                    key={fact.label}
                    // One fact on phones — the length of the trip, which is the one a
                    // day tour and a multi-day experience are first chosen on.
                    className={
                      factIndex === 0
                        ? 'inline-flex items-center gap-1.5 font-body-md text-caption text-white/80'
                        : 'hidden items-center gap-1.5 font-body-md text-caption text-white/75 md:inline-flex'
                    }
                  >
                    <FactIcon icon={fact.icon} className="h-3.5 w-3.5 text-tertiary-fixed-dim" />
                    <span className="sr-only">{ts(`fact.${fact.label}Label`)}: </span>
                    {factText(fact, ts)}
                  </li>
                ))}
              </ul>
            ) : null}

            {/*
              Open by default; collapsed to nothing at rest from `md` up, where hover
              can reveal it instead. Hover has no equivalent on a touch screen, so
              gating the summary behind `group-hover` with no fallback — the original
              behavior here — left it permanently unreadable on a phone, not merely
              undiscoverable. The grid-rows trick animates to the text's real height
              without hard-coding one, and `invisible` keeps the clipped copy out of
              the tab order and off the screen-reader's path while it is closed.

              Left out entirely below `md`: on a phone-width card the open summary
              pushed the copy up over most of the photograph, which is the thing this
              card exists to show. The tour page it links to carries the full copy.
            */}
            {item.summary ? (
              <div className="hidden grid-rows-[1fr] md:grid transition-[grid-template-rows] duration-500 ease-out md:grid-rows-[0fr] md:group-hover:grid-rows-[1fr] md:group-focus-within:grid-rows-[1fr]">
                <p className="visible overflow-hidden font-body-md text-caption leading-relaxed text-white/70 opacity-100 transition-[opacity,visibility] duration-300 md:invisible md:opacity-0 md:group-hover:visible md:group-hover:opacity-100 md:group-focus-within:visible md:group-focus-within:opacity-100">
                  <span className="mt-3 block line-clamp-3">{item.summary}</span>
                </p>
              </div>
            ) : null}

            <div className="mt-3 flex items-end justify-between gap-3 md:mt-4 md:border-t md:border-white/15 md:pt-4">
              <div>
                {item.priceFrom !== null ? (
                  <span className="block">
                    <span className="block font-label-caps text-label-caps uppercase tracking-widest text-white/60 md:text-white/55">
                      {ts('from')}
                    </span>
                    {/* One line: a five-figure price in EGP wrapped "per person" in two. */}
                    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <Price
                        amount={item.priceFrom}
                        currencies={currencies}
                        className="font-headline-card text-xl text-white md:text-headline-card"
                      />
                      <span className="font-body-md text-caption text-white/60">
                        {ts('perPersonShort')}
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="font-body-md text-body-md text-white/80">
                    {ts('priceOnRequest')}
                  </span>
                )}
              </div>

              {/* Decorative: the title link above is the card's one real link. */}
              <span
                aria-hidden
                // A filled white disc on phones, where it sits straight on the photo
                // with no panel behind it; outlined in the frosted panel from `md`.
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-sm transition-colors duration-300 md:h-11 md:w-11 md:border md:border-white/25 md:bg-transparent md:text-white md:shadow-none md:group-hover:border-white md:group-hover:bg-white md:group-hover:text-brand"
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
