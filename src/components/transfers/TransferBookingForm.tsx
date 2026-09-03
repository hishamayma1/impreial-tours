'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { DatePicker } from '@/components/ui/DatePicker'
import { Icon } from '@/components/ui/Icon'
import { useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/stores/preferences-store'
import { usePreferencesStore } from '@/stores'
import type { CurrencyVM } from '@/types/content'
import type { TransferDetailVM } from '@/types/services'

/**
 * The sentinel for "my destination is not on your list".
 *
 * A real option value rather than a separate checkbox, because it belongs in the same
 * decision as every other destination: a visitor scanning the list for their hotel
 * should find the way out at the bottom of that same list, not somewhere else on the
 * page after concluding it is missing.
 */
const CUSTOM = '__custom__'

type Variant = 'airport' | 'intercity'

type Props = {
  transfer: TransferDetailVM
  variant: Variant
  currencies: CurrencyVM[]
}

type Status = 'idle' | 'submitting' | 'booked' | 'quoted' | 'error'

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

const field =
  'h-12 w-full rounded-xl border border-white/60 bg-surface-container-lowest/70 px-4 font-body-md text-body-md text-primary shadow-sm backdrop-blur-sm ' +
  'transition-[border-color,box-shadow] duration-200 placeholder:text-outline ' +
  'focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25'

const selectField = cn(field, 'appearance-none pe-10')

const labelText = 'mb-1.5 block font-label-caps text-label-caps uppercase tracking-[0.12em] text-on-surface-variant'

/** A labelled field with room for an error message that does not move the layout. */
const Field = ({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) => (
  <div className={cn('min-w-0', className)}>
    <label htmlFor={htmlFor} className={labelText}>
      {label}
    </label>
    {children}
    {/*
      `min-h` reserves the message's line whether or not there is one, so validating a
      field never nudges every control below it down the page.
    */}
    <p
      className={cn(
        'mt-1 min-h-[1.15rem] font-body-md text-caption',
        error ? 'text-error' : 'text-on-surface-variant',
      )}
    >
      {error || hint || ' '}
    </p>
  </div>
)

const Select = ({ id, value, onChange, children, invalid }: {
  id: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  invalid?: boolean
}) => (
  <div className="relative">
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={invalid || undefined}
      // The platform select honours none of the site's fonts, radii or colours, so it
      // is stripped and the chevron drawn back in.
      className={cn(selectField, invalid && 'border-error/60')}
    >
      {children}
    </select>
    <Icon
      name="chevron-down"
      className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
    />
  </div>
)

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

/**
 * The inline transfer booking form, serving both the airport and city-to-city pages.
 *
 * It prices as you choose — but only for display. Every figure is recomputed by
 * `/api/bookings` from the CMS rows named by `zoneId` / `routeId` / `extraIds`, so the
 * total here is a quote the server either confirms or refuses; it is never the amount
 * that gets recorded.
 *
 * Two destinations for a submission, decided by whether the chosen route has a price:
 *  - a known zone or route posts to `/api/bookings` and comes back a confirmed booking;
 *  - anything the customer typed in themselves has no price to charge, so it posts to
 *    `/api/whatsapp-quote` and lands in Quote Requests for a human to price.
 */
export const TransferBookingForm = ({ transfer, variant, currencies }: Props) => {
  const t = useTranslations('transfers.form')
  const s = useTranslations('services')
  const locale = useLocale() as Locale
  const router = useRouter()

  const currencyCode = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  const money = (amount: number) => formatPrice(amount, currency, locale)

  // --- selection state ------------------------------------------------------
  const [direction, setDirection] = useState<'arrival' | 'departure'>('arrival')
  const [roundTrip, setRoundTrip] = useState(false)
  const [airportId, setAirportId] = useState(transfer.airports[0]?.id ?? '')
  const [terminal, setTerminal] = useState('')
  /**
   * The raw value of the route select, and the single source for everything derived
   * from it.
   *
   * For an airport that is `${zoneId}::${area}` — the customer picks a *place*, and the
   * zone (and so the price) follows from it, because 'which price band is my hotel in'
   * is not a question a traveller can answer. For an intercity route it is the route
   * row id. Either way it can also be CUSTOM.
   *
   * Kept whole rather than split into a zone and an area, so the select's `value` and
   * the option it matches are the same string and the control cannot show blank while
   * holding a selection.
   */
  const [choice, setChoice] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [passengers, setPassengers] = useState(2)
  const [luggage, setLuggage] = useState(2)
  const [vehicleClass, setVehicleClass] = useState('')
  const [extraIds, setExtraIds] = useState<string[]>([])

  // --- contact --------------------------------------------------------------
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  /** Honeypot — never shown, never filled by a human. */
  const [company, setCompany] = useState('')

  const [status, setStatus] = useState<Status>('idle')
  const [reference, setReference] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  const isCustom = choice === CUSTOM
  const airport = transfer.airports.find((a) => a.id === airportId)

  const [zoneIdOfChoice, areaOfChoice] = isCustom ? ['', ''] : choice.split('::')
  const selectedZone = transfer.zones.find((zone) => zone.id === zoneIdOfChoice)
  const selectedRoute = transfer.routes.find((route) => route.id === choice)
  /** The predefined area, or whatever the customer typed when nothing fitted. */
  const dropoff = isCustom ? destination : (areaOfChoice ?? '')

  const vehiclePricing = selectedZone?.vehiclePricing ?? selectedRoute?.vehiclePricing ?? []

  /**
   * Vehicles too small for the party are shown but disabled rather than hidden.
   *
   * Hiding them silently shrinks the list as the passenger count rises, which reads as
   * the page losing options; disabling them explains why the cheap one is unavailable
   * and points at the fix.
   */
  const vehicles = vehiclePricing.map((v) => ({
    ...v,
    tooSmall: v.maxPassengers !== null && passengers > v.maxPassengers,
  }))

  const chosenVehicle = vehicles.find((v) => v.vehicleClass === vehicleClass)

  const extrasTotal = transfer.extras
    .filter((extra) => extraIds.includes(extra.id))
    .reduce((sum, extra) => sum + extra.price * (extra.perPassenger ? passengers : 1), 0)

  const legs = roundTrip ? 2 : 1
  const vehicleTotal = chosenVehicle && !chosenVehicle.tooSmall ? chosenVehicle.price * legs : 0
  const total = vehicleTotal + extrasTotal
  const canPrice = !isCustom && vehicleTotal > 0

  const toggleExtra = (id: string) =>
    setExtraIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )

  /**
   * Client-side validation, mirroring the server's schema rather than replacing it.
   *
   * The point of doing it here at all is the error message next to the field; the
   * route re-validates everything with Zod and is the only check that decides whether
   * a booking is written.
   */
  const validate = () => {
    const next: Record<string, string> = {}

    if (variant === 'airport' && transfer.airports.length && !airportId) {
      next.airportId = t('errorRequired')
    }
    if (!choice) next.choice = t('errorRequired')
    if (isCustom && variant === 'airport' && !destination.trim()) {
      next.destination = t('errorRequired')
    }
    if (isCustom && variant === 'intercity') {
      if (!customFrom.trim()) next.customFrom = t('errorRequired')
      if (!customTo.trim()) next.customTo = t('errorRequired')
    }
    if (!date) next.date = t('errorRequired')
    else if (date < new Date().toISOString().slice(0, 10)) next.date = t('errorPastDate')
    if (!time) next.time = t('errorRequired')
    if (!isCustom && !vehicleClass) next.vehicleClass = t('errorPickVehicle')
    if (chosenVehicle?.tooSmall) next.vehicleClass = t('errorTooSmall')

    if (!firstName.trim()) next.firstName = t('errorRequired')
    // Email is the only way a confirmation reaches anyone, so it is required and its
    // shape is checked rather than merely its presence.
    if (!email.trim()) next.email = t('errorRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = t('errorEmail')
    if (!phone.trim()) next.phone = t('errorRequired')

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const pickupLabel = () => {
    if (variant === 'intercity') {
      return isCustom ? customFrom : (selectedRoute?.fromCity ?? '')
    }
    const name = airport ? `${airport.name} (${airport.code})` : ''
    const withTerminal = terminal ? `${name} — ${terminal}` : name
    return direction === 'arrival' ? withTerminal : dropoff
  }

  const dropoffLabel = () => {
    if (variant === 'intercity') {
      return isCustom ? customTo : (selectedRoute?.toCity ?? '')
    }
    const name = airport ? `${airport.name} (${airport.code})` : ''
    return direction === 'arrival' ? dropoff : name
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (status === 'submitting') return
    if (!validate()) return

    setStatus('submitting')
    setServerError('')

    try {
      if (canPrice) {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceType: 'transfer',
            slug: transfer.slug,
            locale,
            dates: { start: date, end: null },
            travelers: { adults: passengers, children: 0, infants: 0 },
            transferDetails: {
              pickup: pickupLabel(),
              dropoff: dropoffLabel(),
              flightNumber,
              vehicleClass,
              pickupTime: time,
              roundTrip,
              // The row ids are what the server prices from; everything above is
              // description for the booking record.
              zoneId: selectedZone?.id ?? '',
              routeId: selectedRoute?.id ?? '',
              airportId,
              terminal,
              passengers,
              luggage,
              extraIds,
            },
            contact: { firstName, lastName, email, phone, notes },
            company,
          }),
        })

        const data = await response.json()
        if (!response.ok || !data.success) throw new Error(data.error || 'server')

        setReference(data.reference ?? null)
        setStatus('booked')
        if (data.bookingId) router.push(`/booking/confirmation/${data.bookingId}`)
        return
      }

      // No price to charge — this becomes an enquiry a human answers.
      const response = await fetch('/api/whatsapp-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          phone,
          email,
          pickupLocation: pickupLabel() || t('customRoute'),
          dropoffLocation: dropoffLabel(),
          date,
          time,
          passengers,
          luggage,
          vehiclePreference: vehicleClass,
          specialRequests: notes,
          preferredLanguage: locale,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'server')

      setReference(data.reference ?? null)
      setStatus('quoted')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'server')
      setStatus('error')
    }
  }

  // --- confirmation ---------------------------------------------------------
  if (status === 'booked' || status === 'quoted') {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center motion-safe:animate-[reveal-in_420ms_cubic-bezier(0.22,1,0.36,1)_both]">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <h3 className="font-headline-card text-headline-card text-primary">
          {status === 'booked' ? t('successBooked') : t('successQuoted')}
        </h3>
        <p className="mx-auto mt-3 max-w-md font-body-md text-body-md text-on-surface-variant">
          {status === 'booked' ? t('successBookedBody') : t('successQuotedBody')}
        </p>
        {reference ? (
          <p className="mt-5 font-label-caps text-label-caps uppercase tracking-widest text-brand">
            {t('reference')}: {reference}
          </p>
        ) : null}
      </div>
    )
  }

  const stagger = (index: number) => ({ '--i': index }) as React.CSSProperties

  return (
    <form
      onSubmit={submit}
      noValidate
      className="glass-panel stagger rounded-2xl p-6 md:p-8"
    >
      {/*
        The heading lives inside the panel rather than above it. The panel overlaps the
        hero's foot by design, and a heading placed above it landed on that dark band
        as dark text — legible only where the two happened not to overlap.
      */}
      <div style={stagger(0)} className="mb-6">
        <h2 className="font-headline-section text-headline-section text-primary">{t('heading')}</h2>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{t('subheading')}</p>
      </div>

      {/* --- direction / trip shape ------------------------------------------ */}
      <div style={stagger(1)} className="mb-6 flex flex-wrap items-center gap-2">
        {variant === 'airport' ? (
          <div role="group" aria-label={t('direction')} className="inline-flex rounded-full border border-hairline bg-surface-container-lowest/70 p-1">
            {(['arrival', 'departure'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDirection(value)}
                aria-pressed={direction === value}
                className={cn(
                  'h-9 rounded-full px-4 font-body-md text-caption transition-colors duration-200',
                  direction === value
                    ? 'bg-brand text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-brand',
                )}
              >
                {t(value === 'arrival' ? 'arrival' : 'departure')}
              </button>
            ))}
          </div>
        ) : null}

        {!selectedRoute?.oneWayOnly ? (
          <label className="inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-full border border-hairline bg-surface-container-lowest/70 px-4">
            <input
              type="checkbox"
              checked={roundTrip}
              onChange={(event) => setRoundTrip(event.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="grid h-[18px] w-[18px] place-items-center rounded-[5px] border border-outline-variant bg-surface-container-lowest transition-colors duration-150 peer-checked:border-brand peer-checked:bg-brand [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
            >
              <Icon name="check" className="h-3 w-3 text-on-primary transition-opacity" />
            </span>
            <span className="font-body-md text-body-md text-primary">{t('roundTrip')}</span>
          </label>
        ) : null}
      </div>

      {/* --- route ------------------------------------------------------------ */}
      <div style={stagger(1)} className="grid gap-x-4 sm:grid-cols-2">
        {variant === 'airport' ? (
          <>
            {/*
              The airport select appears only once an editor has added airports. With
              none configured it would be a control whose every option is the
              placeholder — worse than absent, because it looks like something the
              visitor failed to fill in.
            */}
            {transfer.airports.length ? (
            <Field label={t('airport')} htmlFor="tf-airport" error={errors.airportId}>
              <Select id="tf-airport" value={airportId} onChange={setAirportId} invalid={!!errors.airportId}>
                <option value="">{t('selectAirport')}</option>
                {transfer.airports.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.code})
                  </option>
                ))}
              </Select>
            </Field>
            ) : null}

            <Field label={t('destination')} htmlFor="tf-destination" error={errors.choice}>
              <Select
                id="tf-destination"
                value={choice}
                invalid={!!errors.choice}
                onChange={(value) => {
                  setChoice(value)
                  // The vehicle list belongs to the old zone; keeping the selection
                  // would show a class that may not be priced in the new one.
                  setVehicleClass('')
                  setDestination('')
                }}
              >
                <option value="">{t('selectDestination')}</option>
                {transfer.zones.map((zone) => (
                  <optgroup key={zone.id} label={zone.zoneName}>
                    {zone.areas.map((area) => (
                      <option key={`${zone.id}-${area}`} value={`${zone.id}::${area}`}>
                        {area}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value={CUSTOM}>{t('somewhereElse')}</option>
              </Select>
            </Field>
          </>
        ) : (
          <Field
            label={t('route')}
            htmlFor="tf-route"
            error={errors.choice}
            className="sm:col-span-2"
          >
            <Select
              id="tf-route"
              value={choice}
              invalid={!!errors.choice}
              onChange={(value) => {
                setChoice(value)
                setVehicleClass('')
              }}
            >
              <option value="">{t('selectRoute')}</option>
              {transfer.routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.fromCity} → {route.toCity}
                  {route.distanceKm ? ` · ${route.distanceKm} km` : ''}
                </option>
              ))}
              <option value={CUSTOM}>{t('otherRoute')}</option>
            </Select>
          </Field>
        )}

        {/* The custom entry. Shown only once chosen, so the common path stays short. */}
        {isCustom && variant === 'airport' ? (
          <Field
            label={t('yourDestination')}
            htmlFor="tf-custom-to"
            error={errors.destination}
            hint={t('quoteHint')}
            className="sm:col-span-2"
          >
            <input
              id="tf-custom-to"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              maxLength={200}
              placeholder={t('yourDestinationPlaceholder')}
              aria-invalid={!!errors.destination || undefined}
              className={cn(field, errors.destination && 'border-error/60')}
            />
          </Field>
        ) : null}

        {isCustom && variant === 'intercity' ? (
          <>
            <Field label={t('fromCity')} htmlFor="tf-from" error={errors.customFrom}>
              <input
                id="tf-from"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                maxLength={200}
                aria-invalid={!!errors.customFrom || undefined}
                className={cn(field, errors.customFrom && 'border-error/60')}
              />
            </Field>
            <Field
              label={t('toCity')}
              htmlFor="tf-to"
              error={errors.customTo}
              hint={t('quoteHint')}
            >
              <input
                id="tf-to"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                maxLength={200}
                aria-invalid={!!errors.customTo || undefined}
                className={cn(field, errors.customTo && 'border-error/60')}
              />
            </Field>
          </>
        ) : null}

        {variant === 'airport' && airport?.terminals.length ? (
          <Field label={t('terminal')} htmlFor="tf-terminal">
            <Select id="tf-terminal" value={terminal} onChange={setTerminal}>
              <option value="">{t('anyTerminal')}</option>
              {airport.terminals.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {selectedRoute?.note ? (
          <p className="mb-4 rounded-xl border border-hairline bg-brand/[0.04] p-3 font-body-md text-caption text-on-surface-variant sm:col-span-2">
            {selectedRoute.note}
          </p>
        ) : null}
      </div>

      {/* --- when / who ------------------------------------------------------- */}
      <div style={stagger(2)} className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t('date')} htmlFor="tf-date" error={errors.date}>
          <DatePicker
            id="tf-date"
            value={date}
            onChange={setDate}
            invalid={!!errors.date}
            className={cn(field, 'h-12', errors.date && 'border-error/60')}
          />
        </Field>

        <Field label={t('time')} htmlFor="tf-time" error={errors.time}>
          <input
            id="tf-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-invalid={!!errors.time || undefined}
            className={cn(field, errors.time && 'border-error/60')}
          />
        </Field>

        <Field label={t('passengers')} htmlFor="tf-pax">
          <input
            id="tf-pax"
            type="number"
            min={1}
            max={60}
            inputMode="numeric"
            value={passengers}
            onChange={(event) => setPassengers(Math.max(1, Number(event.target.value) || 1))}
            className={field}
          />
        </Field>

        <Field label={t('luggage')} htmlFor="tf-bags">
          <input
            id="tf-bags"
            type="number"
            min={0}
            max={60}
            inputMode="numeric"
            value={luggage}
            onChange={(event) => setLuggage(Math.max(0, Number(event.target.value) || 0))}
            className={field}
          />
        </Field>

        {variant === 'airport' && direction === 'arrival' ? (
          <Field
            label={t('flightNumber')}
            htmlFor="tf-flight"
            hint={t('flightHint')}
            className="sm:col-span-2"
          >
            <input
              id="tf-flight"
              value={flightNumber}
              onChange={(event) => setFlightNumber(event.target.value.toUpperCase())}
              maxLength={20}
              placeholder="MS 777"
              className={field}
            />
          </Field>
        ) : null}
      </div>

      {/* --- vehicle ---------------------------------------------------------- */}
      {!isCustom && vehicles.length ? (
        <fieldset style={stagger(3)} className="mt-2">
          <legend className={labelText}>{t('vehicle')}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => {
              const active = vehicle.vehicleClass === vehicleClass
              return (
                <button
                  key={vehicle.vehicleClass}
                  type="button"
                  disabled={vehicle.tooSmall}
                  onClick={() => setVehicleClass(vehicle.vehicleClass)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-xl border p-4 text-start transition-[transform,border-color,box-shadow] duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                    vehicle.tooSmall
                      ? 'cursor-not-allowed border-hairline/60 bg-surface-container/40 opacity-60'
                      : active
                        ? 'border-brand bg-brand/[0.06] shadow-nav'
                        : 'border-hairline bg-surface-container-lowest/70 hover:border-brand/40 motion-safe:hover:-translate-y-0.5',
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-headline-card text-body-lg text-primary">
                      {vehicle.vehicleClass}
                    </span>
                    <span className="font-headline-card text-body-lg text-brand">
                      {money(vehicle.price * legs)}
                    </span>
                  </span>
                  <span className="mt-1.5 block font-body-md text-caption text-on-surface-variant">
                    {vehicle.maxPassengers ? `${vehicle.maxPassengers} ${s('passengers')}` : ''}
                    {vehicle.maxLuggage !== null ? ` · ${vehicle.maxLuggage} ${s('luggage')}` : ''}
                  </span>
                  {vehicle.tooSmall ? (
                    <span className="mt-1 block font-body-md text-caption text-error">
                      {t('tooSmall')}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <p className="mt-1 min-h-[1.15rem] font-body-md text-caption text-error">
            {errors.vehicleClass || ' '}
          </p>
        </fieldset>
      ) : null}

      {/* --- extras ----------------------------------------------------------- */}
      {!isCustom && transfer.extras.length ? (
        <fieldset style={stagger(4)} className="mt-4">
          <legend className={labelText}>{t('extras')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {transfer.extras.map((extra) => (
              <label
                key={extra.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-surface-container-lowest/60 p-3.5 transition-colors duration-200 hover:border-brand/40"
              >
                <input
                  type="checkbox"
                  checked={extraIds.includes(extra.id)}
                  onChange={() => toggleExtra(extra.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border border-outline-variant bg-surface-container-lowest transition-colors duration-150 peer-checked:border-brand peer-checked:bg-brand [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
                >
                  <Icon name="check" className="h-3 w-3 text-on-primary transition-opacity" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-body-md text-body-md text-primary">{extra.label}</span>
                    <span className="shrink-0 font-body-md text-caption text-brand">
                      +{money(extra.price)}
                      {extra.perPassenger ? ` ${t('perPerson')}` : ''}
                    </span>
                  </span>
                  {extra.description ? (
                    <span className="mt-0.5 block font-body-md text-caption text-on-surface-variant">
                      {extra.description}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {/* --- contact ---------------------------------------------------------- */}
      <div style={stagger(5)} className="mt-6 border-t border-hairline pt-6">
        <p className={cn(labelText, 'mb-3')}>{t('yourDetails')}</p>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={t('firstName')} htmlFor="tf-first" error={errors.firstName}>
            <input
              id="tf-first"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              maxLength={80}
              autoComplete="given-name"
              aria-invalid={!!errors.firstName || undefined}
              className={cn(field, errors.firstName && 'border-error/60')}
            />
          </Field>
          <Field label={t('lastName')} htmlFor="tf-last">
            <input
              id="tf-last"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={80}
              autoComplete="family-name"
              className={field}
            />
          </Field>
          <Field label={t('email')} htmlFor="tf-email" error={errors.email}>
            <input
              id="tf-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={200}
              autoComplete="email"
              aria-invalid={!!errors.email || undefined}
              className={cn(field, errors.email && 'border-error/60')}
            />
          </Field>
          <Field label={t('phone')} htmlFor="tf-phone" error={errors.phone}>
            <input
              id="tf-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={40}
              autoComplete="tel"
              aria-invalid={!!errors.phone || undefined}
              className={cn(field, errors.phone && 'border-error/60')}
            />
          </Field>
          <Field label={t('notes')} htmlFor="tf-notes" className="sm:col-span-2">
            <textarea
              id="tf-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
              rows={3}
              className={cn(field, 'h-auto py-3')}
            />
          </Field>
        </div>

        {/*
          Honeypot. Hidden from sight and from assistive technology, and taken out of
          the tab order — anything that fills it is not a person, and the server
          silently discards the submission.
        */}
        <div aria-hidden className="absolute h-px w-px overflow-hidden opacity-0">
          <label htmlFor="tf-company">Company</label>
          <input
            id="tf-company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </div>
      </div>

      {/* --- total and submit -------------------------------------------------- */}
      <div
        style={stagger(6)}
        className="mt-6 flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          {canPrice ? (
            <>
              <span className={labelText}>{t('total')}</span>
              <span className="block font-headline-section text-headline-section text-primary">
                {money(total)}
              </span>
              {roundTrip ? (
                <span className="font-body-md text-caption text-on-surface-variant">
                  {t('includesReturn')}
                </span>
              ) : null}
            </>
          ) : (
            <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
              {isCustom ? t('quotedManually') : t('choosePrompt')}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className={cn(
            'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-7 font-body-md text-body-md text-on-primary',
            'transition-[transform,background-color,box-shadow] duration-200 hover:bg-brand-light hover:shadow-widget',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'motion-safe:hover:-translate-y-0.5',
          )}
        >
          {status === 'submitting' ? t('submitting') : canPrice ? t('bookNow') : t('requestQuote')}
          <Icon name="arrow-right" className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>

      {status === 'error' ? (
        <p role="alert" className="mt-4 rounded-xl border border-error/30 bg-error/5 p-3 font-body-md text-body-md text-error">
          {serverError === 'rate_limited' ? t('errorRateLimited') : t('errorServer')}
        </p>
      ) : null}
    </form>
  )
}
