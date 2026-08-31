import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Price } from '@/components/ui/Price'
import { Skeleton } from '@/components/ui/Skeleton'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getSpotlightTours } from '@/lib/payload/services'
import type { CurrencyVM } from '@/types/content'

/** Three fits the panel's row without shrinking the thumbnails below legibility. */
const COUNT = 3

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

  const tours = spotlight.top.slice(0, COUNT)
  // An empty catalogue gets no empty rail — the panel simply ends at the links.
  if (!tours.length) return null

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        {/* Tracking matched to the panel's "Browse" heading so the two zones pair. */}
        <h2 className="font-label-caps text-label-caps uppercase tracking-[0.14em] text-on-surface-variant">
          {t('recommended')}
        </h2>
        <Link
          href="/tours"
          className="rounded-sm font-body-md text-caption text-brand underline decoration-hairline underline-offset-4 transition-colors duration-200 hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          {t('viewAll')}
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <li key={tour.id}>
            {/*
              A horizontal card: thumbnail beside the text rather than above it. The
              panel is a band, so height is the scarce dimension here and width is not
              — the same card stacked would push the fold down for no gain.
            */}
            <Link
              href={tour.href}
              className="group/rec flex items-center gap-3.5 rounded-xl border border-transparent p-2 transition-[transform,border-color,background-color] duration-200 hover:border-hairline hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5"
            >
              <span className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                <CmsImage
                  image={tour.image}
                  alt={tour.title}
                  sizes="96px"
                  className="object-cover transition-transform duration-500 group-hover/rec:scale-105"
                />
              </span>

              <span className="min-w-0">
                <span className="line-clamp-2 block font-headline-card text-body-md leading-snug text-primary transition-colors duration-200 group-hover/rec:text-brand">
                  {tour.title}
                </span>

                <span className="mt-1 flex items-center gap-2 font-body-md text-caption text-on-surface-variant">
                  {tour.priceFrom !== null ? (
                    <>
                      {s('from')}{' '}
                      <Price
                        amount={tour.priceFrom}
                        currencies={currencies}
                        className="text-primary"
                      />
                    </>
                  ) : (
                    s('priceOnRequest')
                  )}
                  {tour.rating ? (
                    <>
                      <span aria-hidden className="text-outline">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <span aria-hidden className="text-brand">
                          ★
                        </span>
                        <span className="sr-only">{s('fact.ratingLabel')}: </span>
                        {tour.rating.toFixed(1)}
                      </span>
                    </>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Placeholder while the rail's query resolves.
 *
 * The header must not wait on the database — it is above the fold on every route — so
 * the rail streams in behind its own Suspense boundary. This matches its box exactly,
 * and since the panel starts closed it is normally never seen at all.
 */
export const NavRecommendationsSkeleton = () => (
  <div>
    <Skeleton className="mb-4 h-3 w-40" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-3.5 p-2">
          <Skeleton className="h-16 w-24 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
)
