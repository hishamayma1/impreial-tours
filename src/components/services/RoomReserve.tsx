'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Icon } from '@/components/ui/Icon'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { useBookingStore } from '@/stores'
import { formatPrice, usePreferencesStore } from '@/stores/preferences-store'
import type { CurrencyVM } from '@/types/content'
import type { HotelDetailVM } from '@/types/services'

type Occupancy = 'single' | 'double' | 'triple'

type Props = {
  hotel: Pick<HotelDetailVM, 'id' | 'slug' | 'name'>
  heroImageUrl: string | null
  room: HotelDetailVM['roomTypes'][number]
  currencies: CurrencyVM[]
}

/** Guests implied by each occupancy, used to size the booking the wizard opens with. */
const GUESTS: Record<Occupancy, number> = { single: 1, double: 2, triple: 3 }

/**
 * The rate picker and reserve action on a room card.
 *
 * The three rates are a choice, not a table: a room priced for one, two or three
 * people is three different purchases, and making the visitor pick here means the
 * checkout opens on the room and occupancy they actually chose rather than on an empty
 * form they have to fill in again.
 *
 * It is also the only interactive part of the card, so it is the only part that ships
 * as a client component — the photograph, the badges and the copy stay server-rendered.
 */
export const RoomReserve = ({ hotel, heroImageUrl, room, currencies }: Props) => {
  const t = useTranslations('services')
  const locale = useLocale()
  const router = useRouter()

  const setService = useBookingStore((state) => state.setService)
  const addRoom = useBookingStore((state) => state.addRoom)

  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]

  const rates = (
    [
      ['single', room.pricing.singlePrice],
      ['double', room.pricing.doublePrice],
      ['triple', room.pricing.triplePrice],
    ] as const
  ).filter((entry): entry is [Occupancy, number] => typeof entry[1] === 'number' && entry[1] > 0)

  /**
   * Defaults to the double rate when there is one, because two is how most rooms are
   * sold — falling back to whatever the room does offer rather than to a fixed guess
   * that may not exist on this room at all.
   */
  const [occupancy, setOccupancy] = useState<Occupancy>(
    rates.find(([key]) => key === 'double')?.[0] ?? rates[0]?.[0] ?? 'double',
  )

  const soldOut = room.inventory === 0
  const unitPrice = rates.find(([key]) => key === occupancy)?.[1] ?? 0

  // No rate at all means the room cannot be sold from here; the card says so rather
  // than offering a button that would seed a checkout with a zero.
  if (!rates.length) {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant">{t('priceOnRequest')}</p>
    )
  }

  const reserve = () => {
    if (soldOut) return

    /**
     * Seed the checkout before navigating.
     *
     * The wizard reads its item from the booking store and ignores the `?item=` query
     * the old link carried, so without this the "Book now" button opened an empty
     * form. Writing the snapshot and the room selection here is what makes the button
     * on this card actually reserve this room.
     */
    setService('hotel', {
      id: hotel.id,
      slug: hotel.slug,
      label: hotel.name,
      image: heroImageUrl,
      basePrice: unitPrice,
    })

    addRoom({
      roomTypeId: room.id,
      roomName: room.roomName,
      occupancy,
      guests: GUESTS[occupancy],
      quantity: 1,
      unitPrice,
    })

    router.push('/booking/hotel')
  }

  return (
    <div className="mt-5 border-t border-hairline pt-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="mb-2 block font-label-caps text-label-caps uppercase tracking-[0.12em] text-on-surface-variant">
            {t('occupancy')}
          </span>

          <div role="group" aria-label={t('occupancy')} className="flex flex-wrap gap-2">
            {rates.map(([key, price]) => {
              const active = key === occupancy
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOccupancy(key)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-xl border px-3.5 py-2 text-start transition-[transform,border-color,background-color] duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                    active
                      ? 'border-brand bg-brand/[0.06]'
                      : 'border-hairline hover:border-brand/40 motion-safe:hover:-translate-y-0.5',
                  )}
                >
                  <span className="block font-body-md text-caption text-on-surface-variant">
                    {t(key)}
                  </span>
                  <span
                    className={cn(
                      'block font-headline-card text-body-lg',
                      active ? 'text-brand' : 'text-primary',
                    )}
                  >
                    {formatPrice(price, currency, locale)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={reserve}
            disabled={soldOut}
            className={cn(
              'inline-flex h-12 items-center gap-2 rounded-xl px-6 font-body-md text-body-md',
              'transition-[transform,background-color,box-shadow] duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
              soldOut
                ? 'cursor-not-allowed bg-surface-container text-outline'
                : 'bg-brand text-on-primary hover:bg-brand-light hover:shadow-widget motion-safe:hover:-translate-y-0.5',
            )}
          >
            {soldOut ? t('soldOut') : t('reserve')}
            {soldOut ? null : <Icon name="arrow-right" className="h-4 w-4 rtl:rotate-180" />}
          </button>
          <span className="font-body-md text-caption text-on-surface-variant">
            {t('perPerson')}
          </span>
        </div>
      </div>
    </div>
  )
}
