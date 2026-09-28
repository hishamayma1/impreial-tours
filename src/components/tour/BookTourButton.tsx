'use client'

import { useTranslations } from 'next-intl'

import { buttonStyles } from '@/components/ui/Button'
import { useRouter } from '@/i18n/navigation'
import { useBookingStore } from '@/stores'
import type { ItemPricing } from '@/stores/booking-store'

type Props = {
  tour: {
    id: string
    slug: string
    title: string
    image: string | null
    basePrice: number | null
  }
  pricing: Extract<ItemPricing, { kind: 'dailyTour' | 'experience' }>
  className?: string
}

/**
 * "Book now" on a tour page.
 *
 * This used to be a plain link to `/booking/tour?item=…`, but the checkout reads its
 * product from the booking store and never from the URL — so the link opened a
 * checkout with no tour in it, and submitting it could only fail. Seeding the store
 * before navigating is what makes the button book this tour.
 */
export const BookTourButton = ({ tour, pricing, className }: Props) => {
  const t = useTranslations('services')
  const router = useRouter()
  const setService = useBookingStore((state) => state.setService)
  const setTourOptions = useBookingStore((state) => state.setTourOptions)

  const book = () => {
    setService(pricing.kind, {
      id: tour.id,
      slug: tour.slug,
      label: tour.title,
      image: tour.image,
      basePrice: tour.basePrice,
      pricing,
    })
    // A tour with a single departure time has nothing to choose — take it.
    if (pricing.kind === 'dailyTour' && pricing.startTimes.length === 1) {
      setTourOptions({ startTime: pricing.startTimes[0] })
    }
    router.push('/booking/tour')
  }

  return (
    <button
      type="button"
      onClick={book}
      className={buttonStyles({ variant: 'navy', size: 'lg', className: `w-full justify-center ${className ?? ''}` })}
    >
      {t('bookNow')}
    </button>
  )
}
