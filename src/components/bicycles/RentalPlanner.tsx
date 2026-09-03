'use client'

import { useId, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { DatePicker } from '@/components/ui/DatePicker'
import { Icon } from '@/components/ui/Icon'
import { useRouter } from '@/i18n/navigation'
import { addHoursToTime } from '@/lib/date'
import {
  clampHours,
  formatDuration,
  presetHours,
  quoteRental,
  toPricingConfig,
  type RentalBand,
} from '@/lib/rental-pricing'
import { cn } from '@/lib/utils'
import { formatPrice, usePreferencesStore, useBookingStore } from '@/stores'
import type { CurrencyVM } from '@/types/content'

export type RentalPlannerProps = {
  id: string
  slug: string
  title: string
  image: string | null
  /** The editor's time-pricing rules, exactly as the dashboard holds them. */
  pricing: {
    pricingMode: 'both' | 'bands' | 'hourly'
    hourlyRate: number | null
    extraHourRate: number | null
    minHours: number
    maxHours: number
    hourStep: number
    deliveryFee: number | null
    weekendSurchargePct: number | null
  }
  bands: RentalBand[]
  pickupSlots: string[]
  deposit: number | null
  inventory: number | null
  currencies: CurrencyVM[]
}

/** Friday and Saturday, which is the weekend the surcharge is named for. */
const isWeekend = (iso: string): boolean => {
  if (!iso) return false
  const day = new Date(`${iso}T00:00:00`).getDay()
  return day === 5 || day === 6
}

/**
 * The rent-by-time planner.
 *
 * The one genuinely interactive thing on the page, and the reason the rest of the route
 * is server-rendered: this needs to re-price on every nudge of a slider, so it is a
 * client component and nothing else has to be.
 *
 * It prices with the same `quoteRental` the checkout uses. That is the whole design —
 * the figure here is not an estimate that the server later revises, it is the same
 * function over the same CMS-authored rules, so the total shown before committing is
 * the total charged after.
 *
 * The visitor picks any duration on the editor's own step, and the planner reports back
 * *how* it arrived at the price — "half day package", "full day plus 2 hours" — because
 * a number that drops as you extend the rental looks like a bug unless it says why.
 */
export const RentalPlanner = ({
  id,
  slug,
  title,
  image,
  pricing,
  bands,
  pickupSlots,
  deposit,
  inventory,
  currencies,
}: RentalPlannerProps) => {
  const t = useTranslations('bicycles')
  const s = useTranslations('services')
  const locale = useLocale()
  const router = useRouter()

  const currencyCode = usePreferencesStore((state) => state.currency)
  const setBicycleSelection = useBookingStore((state) => state.setBicycleSelection)
  const setService = useBookingStore((state) => state.setService)
  const setDates = useBookingStore((state) => state.setDates)

  const panelId = useId()

  // Rebuilt only when the props change, which is never for a given page — the config is
  // normalisation over CMS values, not something to redo on each keystroke.
  const config = useMemo(
    () => toPricingConfig({ ...pricing, bands }),
    [pricing, bands],
  )

  const presets = useMemo(() => presetHours(config), [config])

  const [hours, setHours] = useState(() => clampHours(config, presets[0] ?? config.minHours))
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState('')
  const [pickup, setPickup] = useState(pickupSlots[0] ?? '')
  const [delivery, setDelivery] = useState(false)

  const weekend = isWeekend(date)

  const quote = useMemo(
    () => quoteRental(config, { hours, quantity, weekend, delivery }),
    [config, hours, quantity, weekend, delivery],
  )

  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  const money = (amount: number) => formatPrice(amount, currency, locale)

  const durationLabels = {
    hour: t('unitHour'),
    minute: t('unitMinute'),
    day: t('unitDay'),
    days: t('unitDays'),
  }
  const durationText = formatDuration(hours, durationLabels)

  /** Plain language for how the cheapest price was reached. */
  const basisText = (() => {
    if (!quote.basis) return ''
    switch (quote.basis.kind) {
      case 'hourly':
        return t('basisHourly', {
          rate: money(config.hourlyRate ?? 0),
          hours: formatDuration(quote.basis.hours, durationLabels),
        })
      case 'band':
        return t('basisPackage', { label: quote.basis.band.durationLabel })
      case 'band-plus-hours':
        return t('basisPackagePlus', {
          label: quote.basis.band.durationLabel,
          hours: String(quote.basis.extraHours),
        })
      case 'band-multiple':
        return t('basisPackageTimes', {
          label: quote.basis.band.durationLabel,
          count: String(quote.basis.units),
        })
    }
  })()

  const soldOut = inventory !== null && inventory <= 0
  const overStock = inventory !== null && inventory > 0 && quantity > inventory

  const onReserve = () => {
    if (soldOut || overStock || !quote.basis) return

    // The store carries the visitor's choices to the checkout; the server re-prices
    // from the CMS regardless, so nothing here is trusted as a price.
    setService('bicycle', { id, slug, label: title, image, basePrice: quote.unitPrice })
    setBicycleSelection({
      durationLabel: durationText,
      durationHours: hours,
      quantity,
      pickupDate: date,
      pickupTime: pickup,
      returnTime: pickup ? addHoursToTime(pickup, hours) : '',
      weekend,
      delivery,
      unitPrice: quote.unitPrice,
    })
    // The wizard's own "your trip" step reads `dates.start`, not the bicycle
    // selection — carry the chosen pickup date over so the visitor is not asked to
    // pick the same date twice.
    setDates(date, null)
    router.push(`/booking/bike?item=${slug}`)
  }

  const control =
    'h-11 rounded-xl border border-hairline bg-surface-container-lowest font-body-md text-body-md text-primary transition-colors duration-200 focus:border-brand focus:outline-none'
  const label = 'mb-2 block font-label-caps text-label-caps uppercase tracking-[0.12em] text-on-surface-variant'

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest shadow-widget">
      <div className="border-b border-hairline bg-surface-container-low px-6 py-5">
        <h2 className="font-headline-card text-headline-card text-primary">{t('plannerTitle')}</h2>
        <p className="mt-1.5 font-body-md text-caption text-on-surface-variant">
          {t('plannerIntro')}
        </p>
      </div>

      <div className="p-6">
        {/* --- duration presets ------------------------------------------- */}
        {presets.length > 1 ? (
          <div className="mb-5">
            <span className={label} id={`${panelId}-presets`}>
              {t('howLong')}
            </span>
            <div
              role="group"
              aria-labelledby={`${panelId}-presets`}
              className="flex flex-wrap gap-2"
            >
              {presets.map((preset) => {
                const band = config.bands.find((entry) => entry.durationHours === preset)
                const active = Math.abs(hours - preset) < 1e-9
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHours(clampHours(config, preset))}
                    aria-pressed={active}
                    className={cn(
                      'focus-card relative inline-flex h-9 items-center rounded-full border px-3.5 font-body-md text-caption transition-colors duration-200',
                      active
                        ? 'border-brand bg-brand text-on-primary'
                        : 'border-hairline text-on-surface-variant hover:border-brand/50 hover:text-brand',
                    )}
                  >
                    {band ? band.durationLabel : formatDuration(preset, durationLabels)}
                    {/* The editor's own "best value" flag, surfaced where it decides. */}
                    {band?.popular && !active ? (
                      <span
                        aria-hidden
                        className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand"
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* --- the slider -------------------------------------------------- */}
        {/*
          Shown only when the bike is actually sold by the hour. On a packages-only
          bike every position between two packages would round back to one of them, so
          the control would appear to do nothing for most of its travel.
        */}
        {config.pricingMode !== 'bands' ? (
          <div className="mb-6">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label htmlFor={`${panelId}-hours`} className={cn(label, 'mb-0')}>
                {t('duration')}
              </label>
              <output
                htmlFor={`${panelId}-hours`}
                className="font-headline-card text-headline-card tabular-nums text-primary"
              >
                {durationText}
              </output>
            </div>
            <input
              id={`${panelId}-hours`}
              type="range"
              min={config.minHours}
              max={config.maxHours}
              step={config.hourStep}
              value={hours}
              onChange={(event) => setHours(clampHours(config, Number(event.target.value)))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            />
            <div className="mt-1.5 flex justify-between font-body-md text-caption tabular-nums text-outline">
              <span>{formatDuration(config.minHours, durationLabels)}</span>
              <span>{formatDuration(config.maxHours, durationLabels)}</span>
            </div>
          </div>
        ) : null}

        {/* --- when, and how many ------------------------------------------ */}
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${panelId}-date`} className={label}>
              {t('pickupDate')}
            </label>
            <DatePicker id={`${panelId}-date`} value={date} onChange={setDate} className="w-full" />
          </div>

          {pickupSlots.length ? (
            <div>
              <label htmlFor={`${panelId}-pickup`} className={label}>
                {t('pickupTime')}
              </label>
              <span className="relative block">
                <select
                  id={`${panelId}-pickup`}
                  value={pickup}
                  onChange={(event) => setPickup(event.target.value)}
                  className={cn(control, 'w-full appearance-none pe-9 ps-3.5')}
                >
                  {pickupSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
                />
              </span>
            </div>
          ) : null}
        </div>

        <div className="mb-5">
          <span className={label}>{t('howMany')}</span>
          <div className="inline-flex items-center gap-1 rounded-xl border border-hairline p-1">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              aria-label={t('fewerBikes')}
              className="focus-card grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-brand/[0.06] hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="minus" className="h-4 w-4" />
            </button>
            <span
              aria-live="polite"
              className="min-w-10 text-center font-body-md text-body-md tabular-nums text-primary"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(20, value + 1))}
              disabled={inventory !== null && quantity >= inventory}
              aria-label={t('moreBikes')}
              className="focus-card grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-brand/[0.06] hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
          {inventory !== null && inventory > 0 ? (
            <p className="mt-2 font-body-md text-caption text-on-surface-variant">
              {t('stockLeft', { count: String(inventory) })}
            </p>
          ) : null}
        </div>

        {/* --- delivery ----------------------------------------------------- */}
        {config.deliveryFee ? (
          <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-xl border border-hairline p-3.5 transition-colors duration-200 hover:border-brand/40">
            <input
              type="checkbox"
              checked={delivery}
              onChange={() => setDelivery((value) => !value)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-150',
                'border-outline-variant bg-surface-container-lowest',
                'peer-checked:border-brand peer-checked:bg-brand',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2',
                '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
              )}
            >
              <Icon name="check" className="h-3 w-3 text-on-primary transition-opacity duration-150" />
            </span>
            <Icon name="truck" className="h-4 w-4 shrink-0 text-outline" />
            <span className="min-w-0 flex-1 font-body-md text-body-md text-primary">
              {t('deliverToHotel')}
            </span>
            <span className="shrink-0 font-body-md text-caption text-on-surface-variant">
              +{money(config.deliveryFee)}
            </span>
          </label>
        ) : null}

        {/* --- the quote ---------------------------------------------------- */}
        <div className="rounded-xl border border-hairline bg-surface-container-low p-5">
          {quote.basis ? (
            <>
              <dl className="space-y-2 font-body-md text-body-md">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-on-surface-variant">
                    {basisText}
                    {quantity > 1 ? ` × ${quantity}` : ''}
                  </dt>
                  <dd className="shrink-0 tabular-nums text-primary">{money(quote.subtotal)}</dd>
                </div>

                {quote.weekendSurcharge > 0 ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-on-surface-variant">{t('weekendSurcharge')}</dt>
                    <dd className="shrink-0 tabular-nums text-primary">
                      {money(quote.weekendSurcharge)}
                    </dd>
                  </div>
                ) : null}

                {quote.deliveryFee > 0 ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-on-surface-variant">{t('delivery')}</dt>
                    <dd className="shrink-0 tabular-nums text-primary">
                      {money(quote.deliveryFee)}
                    </dd>
                  </div>
                ) : null}

                <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-3">
                  <dt className="font-medium text-primary">{t('total')}</dt>
                  <dd className="shrink-0 font-headline-card text-headline-card tabular-nums text-primary">
                    {/* Announced on change: the figure moves without the focus moving. */}
                    <span aria-live="polite">{money(quote.total)}</span>
                  </dd>
                </div>
              </dl>

              {/*
                The saving is the planner justifying itself. Someone who slides from two
                hours to five watches the price stop rising, and this is the sentence
                that explains why rather than leaving it looking like a glitch.
              */}
              {quote.savingVsHourly > 0 ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand/[0.07] px-3 py-1.5 font-body-md text-caption text-brand">
                  <Icon name="sparkle" className="h-3.5 w-3.5" />
                  {t('savingVsHourly', { amount: money(quote.savingVsHourly) })}
                </p>
              ) : null}

              {deposit ? (
                <p className="mt-3 font-body-md text-caption text-on-surface-variant">
                  {t('depositNote', { amount: money(deposit) })}
                </p>
              ) : null}
            </>
          ) : (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {s('priceOnRequest')}
            </p>
          )}
        </div>

        {overStock ? (
          <p role="alert" className="mt-3 font-body-md text-caption text-error">
            {t('overStock', { count: String(inventory) })}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onReserve}
          disabled={soldOut || overStock || !quote.basis}
          className="focus-card mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 font-body-md text-body-md text-on-primary transition-colors duration-200 hover:bg-brand-light disabled:cursor-not-allowed disabled:bg-surface-container-highest disabled:text-outline"
        >
          {soldOut ? s('soldOut') : s('reserve')}
          {!soldOut ? <Icon name="arrow-right" className="h-4 w-4 rtl:rotate-180" /> : null}
        </button>

        <p className="mt-3 text-center font-body-md text-caption text-on-surface-variant">
          {t('confirmNote')}
        </p>
      </div>
    </div>
  )
}
