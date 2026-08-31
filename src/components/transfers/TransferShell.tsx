import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Price } from '@/components/ui/Price'
import { cn } from '@/lib/utils'
import type { CurrencyVM, ImageVM } from '@/types/content'
import type { TransferDetailVM, VehiclePriceVM } from '@/types/services'

/**
 * Shared chrome for the three transfer pages.
 *
 * The glass treatment only works where there is something behind it, so the hero
 * carries the photograph and the panels that overlap it use `.glass`; everything
 * further down the page sits on the aurora wash and uses `.glass-panel`, which keeps a
 * near-opaque fill because a heavy blur over a flat background just reads as grey.
 */

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export const TransferHero = ({
  eyebrow,
  title,
  description,
  image,
  facts = [],
}: {
  eyebrow: string
  title: string
  description: string
  image: ImageVM | null
  facts?: Array<{ icon: IconName; label: string }>
}) => (
  <header className="relative isolate overflow-hidden">
    {/*
      `data-hero-zone` is what tells HeaderShell to render the bar transparent over
      this photograph and to turn solid as its foot passes under.
    */}
    <div data-hero-zone className="absolute inset-0 -z-10">
      {image ? (
        <CmsImage image={image} alt="" sizes="100vw" priority className="object-cover" />
      ) : (
        <div className="h-full w-full bg-brand" />
      )}
      {/*
        A two-stop scrim rather than a flat wash: heavy at the top where the white nav
        sits, light across the middle so the photograph survives, and heavy again at
        the foot so the glass panel below has something to sit against.
      */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(10_23_40/0.78),rgb(10_23_40/0.35)_38%,rgb(10_23_40/0.82))]"
      />
    </div>

    <Container className="pb-16 pt-32 md:pb-20 md:pt-40">
      <div className="max-w-3xl">
        <span className="glass mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-white">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/80" />
          {eyebrow}
        </span>
        <h1 className="font-display-hero text-display-hero-mobile leading-[1.08] text-white md:text-[56px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-[60ch] font-body-lg text-body-lg text-white/85">{description}</p>
        ) : null}

        {facts.length ? (
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {facts.map((fact) => (
              <li
                key={fact.label}
                className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 font-body-md text-caption text-white"
              >
                <Icon name={fact.icon} className="h-3.5 w-3.5" />
                {fact.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Container>
  </header>
)

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const TransferSection = ({
  id,
  title,
  children,
  className,
}: {
  id?: string
  title?: string
  children: React.ReactNode
  className?: string
}) => (
  <section id={id} className={cn('scroll-mt-24 py-14 md:py-20', className)}>
    <Container>
      {title ? (
        <h2 className="mb-8 font-headline-section text-headline-section text-primary">{title}</h2>
      ) : null}
      {children}
    </Container>
  </section>
)

/** The fleet, as glass cards with the vehicle photograph when one is uploaded. */
export const FleetGrid = async ({ vehicles }: { vehicles: TransferDetailVM['vehicles'] }) => {
  const s = await getTranslations('services')
  if (!vehicles.length) return null

  return (
    <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle, index) => (
        <li
          key={vehicle.className}
          style={{ '--i': index } as React.CSSProperties}
          className="glass-panel overflow-hidden rounded-2xl card-lift hover:shadow-widget"
        >
          {vehicle.image ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-container">
              <CmsImage
                image={vehicle.image}
                alt={vehicle.className}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="p-5">
            <h3 className="font-headline-card text-headline-card text-primary">
              {vehicle.className}
            </h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-body-md text-caption text-on-surface-variant">
              {vehicle.maxPassengers ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="users" className="h-3.5 w-3.5 text-brand/70" />
                  {vehicle.maxPassengers} {s('passengers')}
                </span>
              ) : null}
              {vehicle.maxLuggage !== null ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="wallet" className="h-3.5 w-3.5 text-brand/70" />
                  {vehicle.maxLuggage} {s('luggage')}
                </span>
              ) : null}
            </p>
            {vehicle.features.length ? (
              <ul className="mt-4 space-y-1.5 border-t border-hairline pt-3">
                {vehicle.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 font-body-md text-caption text-on-surface-variant"
                  >
                    <Icon name="check" className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * A price table for one zone or route.
 *
 * Shared by both pages because the two are the same object wearing different labels:
 * a heading, some context, and a list of vehicle classes with a price each.
 */
export const PriceCard = async ({
  title,
  meta,
  note,
  pricing,
  currencies,
  index = 0,
}: {
  title: string
  meta?: string
  note?: string
  pricing: VehiclePriceVM[]
  currencies: CurrencyVM[]
  index?: number
}) => {
  const s = await getTranslations('services')

  return (
    <article
      style={{ '--i': index } as React.CSSProperties}
      className="glass-panel rounded-2xl p-6 card-lift hover:shadow-widget"
    >
      <h3 className="font-headline-card text-headline-card text-primary">{title}</h3>
      {meta ? (
        <p className="mt-1.5 font-body-md text-caption text-on-surface-variant">{meta}</p>
      ) : null}
      {note ? (
        <p className="mt-3 rounded-xl border border-hairline bg-brand/[0.04] p-3 font-body-md text-caption text-on-surface-variant">
          {note}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
        {pricing.map((price) => (
          <li key={price.vehicleClass} className="flex items-center justify-between gap-4 py-3">
            <span className="font-body-md text-body-md text-on-surface-variant">
              {price.vehicleClass}
              {price.maxPassengers ? ` · ${price.maxPassengers} ${s('passengers')}` : ''}
            </span>
            <Price
              amount={price.price}
              currencies={currencies}
              className="font-headline-card text-headline-card text-primary"
            />
          </li>
        ))}
      </ul>
    </article>
  )
}
