import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Price } from '@/components/ui/Price'
import { cn } from '@/lib/utils'
import type { CurrencyVM } from '@/types/content'
import type { HotelDetailVM } from '@/types/services'

import { RoomReserve } from './RoomReserve'

/** Below this, the count stops being reassurance and starts being a nudge. */
const LOW_INVENTORY = 3

type Props = {
  hotel: HotelDetailVM
  room: HotelDetailVM['roomTypes'][number]
  currencies: CurrencyVM[]
  index: number
}

/** A single fact chip — the room's attributes, stated rather than implied. */
const Chip = ({
  icon,
  children,
  tone = 'neutral',
}: {
  icon: IconName
  children: React.ReactNode
  tone?: 'neutral' | 'positive'
}) => (
  <li
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body-md text-caption',
      tone === 'positive'
        ? 'border-brand/25 bg-brand/[0.06] text-brand'
        : 'border-hairline text-on-surface-variant',
    )}
  >
    <Icon name={icon} className="h-3.5 w-3.5" />
    {children}
  </li>
)

/**
 * A room, as something you can assess and then reserve.
 *
 * The previous card showed a name, a bed configuration and three numbers. Everything
 * else an editor had already filled in — the photographs, how many it sleeps, whether
 * breakfast is included, whether it can be cancelled, what an extra bed costs, how many
 * are left — was carried all the way through the view model and then thrown away at
 * the last step. This renders it, because those are precisely the facts someone weighs
 * before booking a room, and a card that omits them makes the visitor go and ask.
 *
 * Laid out as media beside content from `md` up: the photograph earns its place at a
 * size worth looking at without pushing the rates below the fold, which is what a
 * stacked card would do on every screen wider than a phone.
 */
export const RoomCard = async ({ hotel, room, currencies, index }: Props) => {
  const t = await getTranslations('services')

  const photos = room.images.filter((image): image is NonNullable<typeof image> => Boolean(image))
  const lowStock = room.inventory > 0 && room.inventory <= LOW_INVENTORY

  // The lead rate, so the card can be scanned before it is read.
  const prices = [room.pricing.singlePrice, room.pricing.doublePrice, room.pricing.triplePrice]
    .filter((price): price is number => typeof price === 'number' && price > 0)
  const from = prices.length ? Math.min(...prices) : null

  return (
    <article
      style={{ '--i': index } as React.CSSProperties}
      className={cn(
        'glass-panel overflow-hidden rounded-2xl card-lift hover:border-brand/30 hover:shadow-widget',
        /**
         * The two-column split is applied only when there is actually a photograph to
         * put in the first column. Declared unconditionally, a card for a room with no
         * images still created both tracks and dropped its only child — the content —
         * into the 17rem media column, leaving the body squeezed to 272px of a
         * 1184px card and the rest of it empty.
         */
        photos.length && 'md:grid md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]',
      )}
    >
      {photos.length ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container md:aspect-auto md:h-full">
          <CmsImage
            image={photos[0]}
            alt={room.roomName}
            sizes="(min-width: 768px) 17rem, 100vw"
            className="object-cover"
          />
          {photos.length > 1 ? (
            <span className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 font-body-md text-caption text-white backdrop-blur-sm">
              <Icon name="sparkle" className="h-3 w-3" />
              {t('photos', { count: String(photos.length) })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h3 className="font-headline-card text-headline-card text-primary">{room.roomName}</h3>
          {from !== null ? (
            <p className="text-end">
              <span className="block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                {t('from')}
              </span>
              <Price
                amount={from}
                currencies={currencies}
                className="font-headline-card text-headline-card text-primary"
              />
            </p>
          ) : null}
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          <Chip icon="users">{t('sleeps', { count: String(room.maxOccupancy) })}</Chip>
          {room.bedConfiguration ? <Chip icon="bed">{room.bedConfiguration}</Chip> : null}
          {room.breakfastIncluded ? (
            <Chip icon="check" tone="positive">
              {t('breakfastIncluded')}
            </Chip>
          ) : null}
          {/*
            Refundability is stated either way. Showing only the good news would leave a
            non-refundable room looking identical to one whose editor had not said —
            which is the fact a buyer most needs before paying.
          */}
          <Chip icon={room.refundable ? 'shield' : 'close'} tone={room.refundable ? 'positive' : 'neutral'}>
            {room.refundable ? t('freeCancellation') : t('nonRefundable')}
          </Chip>
          {room.extraBedPrice ? (
            <Chip icon="wallet">
              {t('extraBed')} <Price amount={room.extraBedPrice} currencies={currencies} />
            </Chip>
          ) : null}
        </ul>

        {room.roomDescription ? (
          <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
            {room.roomDescription}
          </p>
        ) : null}

        {lowStock ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-error/5 px-3 py-1.5 font-body-md text-caption text-error">
            <Icon name="clock" className="h-3.5 w-3.5" />
            {t('roomsLeft', { count: String(room.inventory) })}
          </p>
        ) : null}

        <RoomReserve
          hotel={{ id: hotel.id, slug: hotel.slug, name: hotel.name }}
          heroImageUrl={hotel.heroImage?.url ?? null}
          room={room}
          currencies={currencies}
        />
      </div>
    </article>
  )
}
