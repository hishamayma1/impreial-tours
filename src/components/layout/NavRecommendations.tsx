import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Icon } from '@/components/ui/Icon'
import { Price } from '@/components/ui/Price'
import { Skeleton } from '@/components/ui/Skeleton'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getSpotlightHotels } from '@/lib/payload/hotels'
import { getSpotlightTours } from '@/lib/payload/services'
import type { CurrencyVM, NavSpotlightItemVM } from '@/types/content'
import type { SpotlightTourVM } from '@/types/services'
import { cn } from '@/lib/utils'

/** Three fits the panel's row without shrinking the thumbnails below legibility. */
const COUNT = 3

/** `SpotlightTourVM`'s `rating` is optional; the rail's shape requires it present. */
const toSpotlightItems = (tours: SpotlightTourVM[]): NavSpotlightItemVM[] =>
  tours.map((tour) => ({
    id: tour.id,
    href: tour.href,
    title: tour.title,
    image: tour.image,
    priceFrom: tour.priceFrom,
    rating: tour.rating ?? null,
  }))

/**
 * The bento recommendation rail shared by every hub's mega panel.
 *
 * Takes the items already fetched and shaped, so it never knows whether it is
 * showing tours or hotels — that decision lives in the three wrappers below, each
 * of which owns its own query and its own "view all" destination.
 */
const NavRecommendationRail = ({
  heading,
  viewAllHref,
  viewAllLabel,
  items,
  currencies,
  ratingLabel,
  fromLabel,
  priceOnRequestLabel,
}: {
  heading: string
  viewAllHref: string
  viewAllLabel: string
  items: NavSpotlightItemVM[]
  currencies: CurrencyVM[]
  ratingLabel: string
  fromLabel: string
  priceOnRequestLabel: string
}) => {
  // An empty catalogue gets no empty rail — the panel simply ends at the links.
  if (!items.length) return null

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        {/* Tracking matched to the panel's "Browse" heading so the two zones pair. */}
        <h2 className="font-label-caps text-label-caps uppercase tracking-[0.14em] text-on-surface-variant">
          {heading}
        </h2>
        <Link
          href={viewAllHref}
          className="rounded-sm font-body-md text-caption text-brand underline decoration-hairline underline-offset-4 transition-colors duration-200 hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          {viewAllLabel}
        </Link>
      </div>

      {/*
        A bento grid rather than a uniform row: the first pick gets the full-bleed
        feature tile — the biggest lever for making one item look chosen — and the
        rest fill the remaining cells at a size that still reads at a glance. Fixed
        row heights are what let a 2-row span actually double the first tile instead
        of just matching its neighbour's implicit height.
      */}
      <ul className="grid grid-cols-2 grid-rows-2 gap-3 sm:grid-cols-4">
        {items.map((item, index) => {
          const isFeature = index === 0
          return (
            <li
              key={item.id}
              className={cn(
                'col-span-2 row-span-1',
                isFeature && 'row-span-2 sm:col-span-2',
                !isFeature && 'sm:col-span-2',
              )}
            >
              <Link
                href={item.href}
                className={cn(
                  'group/rec relative block h-full min-h-[104px] overflow-hidden rounded-xl bg-surface-container',
                  'transition-[box-shadow,transform] duration-200 hover:shadow-nav motion-safe:hover:-translate-y-0.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                )}
              >
                <CmsImage
                  image={item.image}
                  alt={item.title}
                  sizes={isFeature ? '360px' : '220px'}
                  className="object-cover transition-transform duration-500 group-hover/rec:scale-105"
                />
                {/* A bottom-anchored scrim, so the title stays legible over any photo. */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
                />

                {item.rating ? (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 font-body-md text-caption text-white backdrop-blur-sm">
                    <Icon name="star" className="h-3 w-3 text-tertiary-fixed" />
                    <span className="sr-only">{ratingLabel}: </span>
                    {item.rating.toFixed(1)}
                  </span>
                ) : null}

                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
                  <span
                    className={cn(
                      'line-clamp-2 block font-headline-card leading-snug text-white',
                      isFeature ? 'text-body-lg' : 'text-body-md',
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="font-body-md text-caption text-white/80">
                    {item.priceFrom !== null ? (
                      <>
                        {fromLabel}{' '}
                        <Price
                          amount={item.priceFrom}
                          currencies={currencies}
                          className="text-white"
                        />
                      </>
                    ) : (
                      priceOnRequestLabel
                    )}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * The recommendation rail inside the Tours mega panel.
 *
 * Reads the same spotlight query the home page uses, so opening the menu costs
 * nothing on any page that already renders that band and one cached read anywhere
 * else — and the two can never recommend different journeys. `top` rather than `new`:
 * a menu is a shortcut for someone who has not decided yet, and "best rated" is a
 * better answer to that than "most recently added".
 *
 * Rendered on the server and handed to `PrimaryNav` as a slot, so no part of this —
 * the query, the cards, the copy — reaches the client bundle.
 */
export const NavRecommendations = async ({
  locale,
  currencies,
}: {
  locale: Locale
  currencies: CurrencyVM[]
}) => {
  const [spotlight, t, s] = await Promise.all([
    getSpotlightTours(locale),
    getTranslations('nav'),
    getTranslations('services'),
  ])

  return (
    <NavRecommendationRail
      heading={t('recommended')}
      viewAllHref="/tours"
      viewAllLabel={t('viewAll')}
      items={toSpotlightItems(spotlight.top.slice(0, COUNT))}
      currencies={currencies}
      ratingLabel={s('fact.ratingLabel')}
      fromLabel={s('from')}
      priceOnRequestLabel={s('priceOnRequest')}
    />
  )
}

/**
 * The recommendation rail inside the Hotels mega panel — the same treatment as
 * Tours, sourced from the hotels listing's own top-rated slice.
 */
export const NavHotelRecommendations = async ({
  locale,
  currencies,
}: {
  locale: Locale
  currencies: CurrencyVM[]
}) => {
  const [items, t, s] = await Promise.all([
    getSpotlightHotels(locale),
    getTranslations('nav'),
    getTranslations('services'),
  ])

  return (
    <NavRecommendationRail
      heading={t('recommendedHotels')}
      viewAllHref="/hotels"
      viewAllLabel={t('viewAll')}
      items={items}
      currencies={currencies}
      ratingLabel={s('fact.ratingLabel')}
      fromLabel={s('from')}
      priceOnRequestLabel={s('priceOnRequest')}
    />
  )
}

/**
 * The recommendation rail inside the Transfers mega panel.
 *
 * Transfers is not a browsable catalogue — it is three fixed service types, already
 * listed as the panel's own links — so there is nothing of its own to recommend.
 * What it cross-sells instead is the same top-rated journeys the Tours panel shows:
 * someone booking a transfer is already planning a trip, and a tour is the natural
 * next thing to add to it.
 */
export const NavTransferRecommendations = async ({
  locale,
  currencies,
}: {
  locale: Locale
  currencies: CurrencyVM[]
}) => {
  const [spotlight, t, s] = await Promise.all([
    getSpotlightTours(locale),
    getTranslations('nav'),
    getTranslations('services'),
  ])

  return (
    <NavRecommendationRail
      heading={t('recommended')}
      viewAllHref="/tours"
      viewAllLabel={t('viewAll')}
      items={toSpotlightItems(spotlight.top.slice(0, COUNT))}
      currencies={currencies}
      ratingLabel={s('fact.ratingLabel')}
      fromLabel={s('from')}
      priceOnRequestLabel={s('priceOnRequest')}
    />
  )
}

/**
 * Placeholder while a rail's query resolves.
 *
 * The header must not wait on the database — it is above the fold on every route — so
 * each rail streams in behind its own Suspense boundary. This matches its box exactly,
 * and since the panel starts closed it is normally never seen at all.
 */
export const NavRecommendationsSkeleton = () => (
  <div>
    <Skeleton className="mb-4 h-3 w-40" />
    <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:grid-cols-4">
      <Skeleton className="col-span-2 row-span-2 min-h-[104px] rounded-xl sm:col-span-2" />
      <Skeleton className="col-span-2 row-span-1 min-h-[104px] rounded-xl sm:col-span-2" />
      <Skeleton className="col-span-2 row-span-1 min-h-[104px] rounded-xl sm:col-span-2" />
    </div>
  </div>
)
