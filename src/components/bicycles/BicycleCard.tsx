import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Price } from '@/components/ui/Price'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { BicycleCardVM } from '@/types/services'
import type { CurrencyVM } from '@/types/content'

type BicycleCardProps = {
  item: BicycleCardVM
  currencies: CurrencyVM[]
  /** Position in the grid, driving the staggered entrance and image priority. */
  index: number
}

const CATEGORY_ICON: Record<string, IconName> = {
  city: 'bike',
  electric: 'bolt',
  mountain: 'mountain',
  road: 'gauge',
  touring: 'compass',
  kids: 'users',
}

/**
 * One bicycle, as a card.
 *
 * The listing sells two different things and the card's whole structure follows from
 * that. A rental's headline is a rate and a window — what an hour costs, how long you
 * may keep it — so it prints a small price ladder taken straight from the editor's
 * duration packages. A guided ride's headline is the ride itself: distance, hours,
 * difficulty. The old shared card flattened both into a `meta` string and could say
 * nothing specific about either.
 *
 * Server-rendered end to end. The only client JavaScript on the whole grid is the
 * `Price` span, which needs the visitor's chosen currency; everything else — the
 * hover lift, the entrance, the image treatment — is CSS the browser runs on the
 * compositor.
 */
export const BicycleCard = async ({ item, currencies, index }: BicycleCardProps) => {
  const t = await getTranslations('services')
  const b = await getTranslations('bicycles')

  const isRental = item.bikeType === 'rental'
  const href = `/bicycles/${item.slug}`

  /** The facts printed under the title, at most three so the row never wraps. */
  const facts: Array<{ icon: IconName; value: string; label: string }> = isRental
    ? [
        item.minHours && item.maxHours
          ? {
              icon: 'clock' as const,
              value: b('hoursRange', { min: String(item.minHours), max: String(item.maxHours) }),
              label: b('rentalWindow'),
            }
          : null,
        item.gears
          ? { icon: 'gauge' as const, value: b('gearsValue', { count: String(item.gears) }), label: b('gears') }
          : null,
        item.frameSizes.length
          ? { icon: 'users' as const, value: item.frameSizes.join(' · '), label: b('frameSizes') }
          : null,
      ].filter((fact) => fact !== null)
    : [
        item.distanceKm
          ? { icon: 'compass' as const, value: `${item.distanceKm} km`, label: t('route') }
          : null,
        item.durationHours
          ? { icon: 'clock' as const, value: `${item.durationHours} h`, label: t('duration') }
          : null,
        item.difficulty
          ? {
              icon: 'gauge' as const,
              value: t(`difficulty.${item.difficulty}` as 'difficulty.easy'),
              label: t('difficultyLabel'),
            }
          : null,
      ].filter((fact) => fact !== null)

  return (
    <article
      // The index feeds the staggered entrance in globals.css. Cards below the fold
      // animate as they arrive; the first row is already in view and so renders at its
      // final state, which keeps the LCP element off the animation path entirely.
      style={{ '--i': index } as React.CSSProperties}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest card-lift hover:border-brand/40 hover:shadow-widget"
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-surface-container">
        <CmsImage
          image={item.image}
          alt={item.title}
          // Three columns at desktop, two at tablet, one on a phone — declared so the
          // browser fetches the crop it will actually paint rather than the largest.
          sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw"
          // Only the first row is a candidate for the largest contentful paint;
          // priority on the rest would compete with it for bandwidth.
          priority={index < 3}
          className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
        />

        {/* A floor of shade under the chips, so white text holds on a pale photograph. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent"
        />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-white backdrop-blur-sm">
            <Icon name={CATEGORY_ICON[item.category] ?? 'bike'} className="h-3.5 w-3.5" />
            {isRental ? b('typeRental') : b('typeRide')}
          </span>

          {item.electric ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-on-primary">
              <Icon name="bolt" className="h-3.5 w-3.5" />
              {b('eBike')}
            </span>
          ) : null}
        </div>

        {/*
          Stock, and only when it is low enough to matter. "14 available" is noise;
          "2 left" is the reason someone books today rather than tomorrow.
        */}
        {isRental && item.inventory !== null && item.inventory > 0 && item.inventory <= 3 ? (
          <span className="absolute bottom-4 left-4 rounded-full bg-surface-container-lowest/90 px-3 py-1.5 font-body-md text-caption text-primary backdrop-blur-sm">
            {b('stockLeft', { count: String(item.inventory) })}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-6">
        <h3 className="font-headline-card text-headline-card leading-snug text-primary transition-colors duration-200 group-hover:text-brand">
          {/*
            The whole card is the link target via the overlay below, but the anchor
            itself wraps the title: that is the accessible name a screen reader reads
            out of the link list, and "Electric Trail Bike" is a better one than the
            card's entire text content.
          */}
          <Link href={href} className="focus-card rounded-lg after:absolute after:inset-0">
            {item.title}
          </Link>
        </h3>

        {item.summary ? (
          <p className="mt-2.5 line-clamp-2 font-body-md text-body-md text-on-surface-variant">
            {item.summary}
          </p>
        ) : null}

        {facts.length ? (
          <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {facts.map((fact) => (
              <li
                key={fact.label}
                className="inline-flex items-center gap-1.5 font-body-md text-caption text-on-surface-variant"
              >
                <Icon name={fact.icon} className="h-4 w-4 text-outline" />
                {/* The icon is decorative; the label is what carries the meaning. */}
                <span className="sr-only">{fact.label}: </span>
                {fact.value}
              </li>
            ))}
          </ul>
        ) : null}

        {/*
          The price ladder — the part that makes this a rental card rather than a
          product card. Showing two or three packages beside the hourly rate answers
          "what would a half day cost" without a click, which is the question the
          listing exists to answer.
        */}
        {isRental && item.bands.length ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {item.bands.slice(0, 3).map((band) => (
              <li
                key={`${band.durationLabel}-${band.durationHours}`}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 font-body-md text-caption transition-colors duration-200',
                  band.popular
                    ? 'border-brand/40 bg-brand/[0.06] text-brand'
                    : 'border-hairline text-on-surface-variant',
                )}
              >
                <span className="text-outline">{band.durationLabel}</span>{' '}
                <Price amount={band.price} currencies={currencies} className="font-medium text-primary" />
              </li>
            ))}
          </ul>
        ) : null}

        {/* Pinned to the bottom so every card in a row rules off at the same height. */}
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-hairline pt-4">
          <p className="font-body-md text-caption text-on-surface-variant">
            {item.priceFrom !== null ? (
              <>
                {t('from')}{' '}
                <Price
                  amount={item.priceFrom}
                  currencies={currencies}
                  className="font-headline-card text-headline-card text-primary"
                />
                {/*
                  The unit is only printed when it is actually true of the number beside
                  it. On a packages-only bike the entry price is the cheapest package,
                  not an hourly rate, and labelling that "/hr" would understate the
                  price by whatever the package covers.
                */}
                {!isRental ? (
                  <span className="ms-1 text-outline">{t('perPersonShort')}</span>
                ) : item.hourlyRate !== null && item.priceFrom === item.hourlyRate ? (
                  <span className="ms-1 text-outline">{b('perHourShort')}</span>
                ) : null}
              </>
            ) : (
              t('priceOnRequest')
            )}
          </p>

          <span
            aria-hidden
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-on-surface-variant transition-colors duration-200 group-hover:border-brand group-hover:bg-brand group-hover:text-on-primary"
          >
            <Icon name="arrow-right" className="h-4 w-4 rtl:rotate-180" />
          </span>
        </div>
      </div>
    </article>
  )
}
