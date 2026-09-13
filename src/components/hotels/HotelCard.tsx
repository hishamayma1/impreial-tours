import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Icon } from '@/components/ui/Icon'
import { Price } from '@/components/ui/Price'
import { Link } from '@/i18n/navigation'
import type { CurrencyVM } from '@/types/content'
import type { ServiceCardVM } from '@/types/services'

/** Beyond this the chips wrap into a second row and stop being scannable. */
const VISIBLE_AMENITIES = 4

/**
 * A hotel, as a wide glass card.
 *
 * Two columns rather than the stacked card the generic grid used: a stay is chosen on
 * the photograph first and the facts second, and side by side lets both be large
 * without making the card tall enough to fit only two on a screen.
 *
 * The whole card is a click target via a stretched pseudo-element on the single link,
 * which keeps exactly one meaningfully-named link in the accessibility tree — a card
 * wrapped in an anchor announces its image, stars and price as part of the link name.
 */
export const HotelCard = async ({
  item,
  currencies,
  index,
}: {
  item: ServiceCardVM
  currencies: CurrencyVM[]
  index: number
}) => {
  const t = await getTranslations('services')
  const filters = await getTranslations('filters')

  const amenities = item.meta.slice(0, VISIBLE_AMENITIES)
  const hidden = item.meta.length - amenities.length

  return (
    <article
      style={{ '--i': index } as React.CSSProperties}
      className="glass-panel group relative flex flex-col overflow-hidden rounded-2xl card-lift hover:border-brand/30 hover:shadow-widget focus-within:border-brand/40 sm:grid sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container sm:aspect-auto sm:h-full">
        <CmsImage
          image={item.image}
          alt={item.title}
          sizes="(min-width: 1024px) 15rem, (min-width: 640px) 40vw, 92vw"
          // The first card is above the fold at every breakpoint, so it is the LCP
          // candidate and loads eagerly.
          priority={index === 0}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {item.rating ? (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 font-body-md text-caption text-white backdrop-blur-sm">
            <span aria-hidden>{'★'.repeat(item.rating)}</span>
            {/* The stars are decorative; the count is what a screen reader hears. */}
            <span className="sr-only">{filters('starsValue', { count: String(item.rating) })}</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-headline-card text-headline-card leading-[1.3] text-primary transition-colors duration-200 group-hover:text-brand">
          <Link
            href={`/hotels/${item.slug}`}
            className="focus-card rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {item.title}
          </Link>
        </h3>

        {item.summary ? (
          <p className="mt-2 inline-flex items-start gap-1.5 font-body-md text-body-md text-on-surface-variant">
            <Icon name="pin" className="mt-1 h-3.5 w-3.5 shrink-0 text-brand/70" />
            {item.summary}
          </p>
        ) : null}

        {amenities.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <li
                key={amenity}
                className="rounded-full border border-hairline px-2.5 py-1 font-body-md text-caption text-on-surface-variant"
              >
                {t(`amenities.${amenity}` as 'amenities.wifi')}
              </li>
            ))}
            {hidden > 0 ? (
              <li className="rounded-full border border-hairline/60 px-2.5 py-1 font-body-md text-caption text-outline">
                +{hidden}
              </li>
            ) : null}
          </ul>
        ) : null}

        {/* mt-auto keeps the price row on a common baseline across the whole grid row. */}
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
                <span className="ms-1.5 font-body-md text-caption text-on-surface-variant">
                  {t('perPersonShort')}
                </span>
              </>
            ) : (
              <span className="font-body-md text-body-md text-on-surface-variant">
                {t('priceOnRequest')}
              </span>
            )}
          </div>

          <span
            aria-hidden
            className="inline-flex items-center gap-1.5 font-body-md text-caption text-brand transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <Icon name="arrow-right" className="h-4 w-4 rtl:rotate-180" />
          </span>
        </div>
      </div>
    </article>
  )
}
