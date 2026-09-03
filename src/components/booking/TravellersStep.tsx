'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { DatePicker } from '@/components/ui/DatePicker'
import { useBookingStore } from '@/stores'

const Field = ({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string
  value: number
  min?: number
  onChange: (value: number) => void
}) => (
  <label className="flex items-center justify-between gap-4 border-b border-hairline py-4">
    <span className="font-body-md text-body-md text-on-surface">{label}</span>
    <input
      type="number"
      min={min}
      value={value}
      onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))}
      className="w-24 rounded-lg border border-hairline bg-surface-container-lowest px-3 py-2 text-right font-body-md text-body-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    />
  </label>
)

export const TravellersStep = ({ serviceType }: { serviceType: string }) => {
  const t = useTranslations('booking')
  const startLabelId = useId()
  const endLabelId = useId()

  const { adults, children, infants } = useBookingStore(
    useShallow((state) => state.travelers),
  )
  const setTravelers = useBookingStore((state) => state.setTravelers)

  const dates = useBookingStore(useShallow((state) => state.dates))
  const setDates = useBookingStore((state) => state.setDates)

  // Only a stay has a check-out date; everything else is a single-day selection.
  const needsEndDate = serviceType === 'hotel'

  return (
    <section>
      <h2 className="mb-6 font-headline-card text-headline-card text-primary">
        {t('steps.details')}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span
            id={startLabelId}
            className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
          >
            {t('startDate')}
          </span>
          <DatePicker
            aria-labelledby={startLabelId}
            value={dates.start ?? ''}
            invalid={!dates.start}
            onChange={(iso) => setDates(iso, dates.end)}
          />
        </div>

        {needsEndDate ? (
          <div className="flex flex-col gap-2">
            <span
              id={endLabelId}
              className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
            >
              {t('endDate')}
            </span>
            <DatePicker
              aria-labelledby={endLabelId}
              value={dates.end ?? ''}
              min={dates.start ?? undefined}
              invalid={!dates.end}
              onChange={(iso) => setDates(dates.start, iso)}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <h3 className="mb-2 font-body-lg text-body-lg text-primary">{t('travellers')}</h3>
        <Field label={t('adults')} value={adults} min={1} onChange={(v) => setTravelers({ adults: v })} />
        <Field label={t('children')} value={children} onChange={(v) => setTravelers({ children: v })} />
        <Field label={t('infants')} value={infants} onChange={(v) => setTravelers({ infants: v })} />
      </div>
    </section>
  )
}
