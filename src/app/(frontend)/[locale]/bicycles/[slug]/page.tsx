import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { GuidedRidePlanner } from '@/components/bicycles/GuidedRidePlanner'
import { RentalPlanner } from '@/components/bicycles/RentalPlanner'
import { CancellationPolicy } from '@/components/shared/CancellationPolicy'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Price } from '@/components/ui/Price'
import { Link } from '@/i18n/navigation'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getBicycleBySlug, getAllSlugs, getAlternateSlugs } from '@/lib/payload/services'
import { cn } from '@/lib/utils'

const PATH = '/bicycles'
type PageParams = { locale: string; slug: string }

export const generateStaticParams = async () => {
  const params: PageParams[] = []
  for (const locale of locales) {
    const slugs = await getAllSlugs('bicycles', locale)
    params.push(...slugs.map((slug) => ({ locale, slug })))
  }
  return params
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> => {
  const { locale, slug } = await params
  const bike = await getBicycleBySlug(locale as Locale, slug)
  if (!bike) return {}

  const alternates = await getAlternateSlugs('bicycles', locale as Locale, slug)

  return {
    title: bike.title,
    description: bike.description,
    alternates: buildAlternates(locale as Locale, PATH, alternates),
    openGraph: { images: bike.image ? [bike.image.url] : [] },
  }
}

/** One fact in the spec strip under the hero. */
const Fact = ({
  icon,
  label,
  value,
}: {
  icon: IconName
  label: string
  value: string
}) => (
  <div className="flex items-start gap-3">
    <span
      aria-hidden
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-container-lowest text-brand"
    >
      <Icon name={icon} className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <dt className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-1 font-body-md text-body-md text-primary">{value}</dd>
    </div>
  </div>
)

const Section = ({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) => (
  <section className={cn('border-t border-hairline pt-10', className)}>
    <h2 className="mb-6 font-headline-section text-headline-section text-primary">{title}</h2>
    {children}
  </section>
)

/**
 * A single bicycle.
 *
 * Laid out as a two-column detail page rather than the shared stack the other services
 * use: a rental is chosen by configuring it, so the planner is pinned beside the copy
 * from `lg` up and the reader never has to scroll back and forth between the
 * specification and the price it produces.
 *
 * The page is a server component throughout. The only JavaScript it ships is the
 * planner — which genuinely needs it, since it re-prices on every interaction — and the
 * currency-aware `Price` spans. The gallery, the specs and the route plan are HTML.
 */
const BicycleDetailPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [bike, settings, t, b] = await Promise.all([
    getBicycleBySlug(locale as Locale, slug),
    getSiteSettings(locale as Locale),
    getTranslations('services'),
    getTranslations('bicycles'),
  ])

  if (!bike) notFound()

  const isRental = bike.bikeType === 'rental'

  const facts = isRental
    ? [
        bike.bikeModel ? { icon: 'bike' as const, label: t('specs'), value: bike.bikeModel } : null,
        bike.specs.gears
          ? {
              icon: 'gauge' as const,
              label: b('gears'),
              value: b('gearsValue', { count: String(bike.specs.gears) }),
            }
          : null,
        bike.specs.electric
          ? { icon: 'bolt' as const, label: b('assistLabel'), value: b('eBike') }
          : null,
        bike.specs.frameSizes.length
          ? {
              icon: 'users' as const,
              label: b('frameSizes'),
              value: bike.specs.frameSizes.join(' · '),
            }
          : null,
        bike.specs.weightKg
          ? { icon: 'shield' as const, label: b('weight'), value: `${bike.specs.weightKg} kg` }
          : null,
      ].filter((fact) => fact !== null)
    : [
        bike.routeName ? { icon: 'compass' as const, label: t('route'), value: bike.routeName } : null,
        bike.distanceKm
          ? { icon: 'pin' as const, label: b('distance'), value: `${bike.distanceKm} km` }
          : null,
        bike.elevationGainM
          ? {
              icon: 'mountain' as const,
              label: b('elevation'),
              value: `${bike.elevationGainM} m`,
            }
          : null,
        bike.durationHours
          ? { icon: 'clock' as const, label: t('duration'), value: `${bike.durationHours} h` }
          : null,
        bike.difficulty
          ? {
              icon: 'gauge' as const,
              label: t('difficultyLabel'),
              value: t(`difficulty.${bike.difficulty}` as 'difficulty.easy'),
            }
          : null,
        bike.maxGroupSize
          ? {
              icon: 'users' as const,
              label: t('groupSize'),
              value: b('upTo', { count: String(bike.maxGroupSize) }),
            }
          : null,
      ].filter((fact) => fact !== null)

  const gallery = bike.gallery.filter((image) => image !== null)

  return (
    <div className="aurora">
      {/* --- hero ---------------------------------------------------------- */}
      {/*
        -mt-20 for the same reason as the home hero: the sticky header reserves its
        height in flow, which otherwise sits as a band of page background above a
        full-bleed image meant to start at the top of the viewport.
      */}
      <header className="-mt-20">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container sm:aspect-[16/9] lg:aspect-[21/9]">
          <CmsImage
            image={bike.image}
            alt={bike.title}
            sizes="100vw"
            // The only above-the-fold image, so it is the LCP element.
            priority
            className="object-cover"
          />
          {/* Enough shade for white type at the foot of any photograph. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
          />

          <Container className="absolute inset-x-0 bottom-0 pb-8 md:pb-12">
            <nav aria-label={t('breadcrumb')} className="mb-4">
              <Link
                href={PATH}
                className="focus-card inline-flex items-center gap-1.5 rounded-lg font-label-caps text-label-caps uppercase tracking-widest text-white/80 transition-colors duration-200 hover:text-white"
              >
                <Icon name="chevron-left" className="h-3.5 w-3.5 rtl:rotate-180" />
                {b('title')}
              </Link>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-white backdrop-blur-sm">
                {isRental ? b('typeRental') : b('typeRide')}
              </span>
              {bike.specs.electric ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-on-primary">
                  <Icon name="bolt" className="h-3.5 w-3.5" />
                  {b('eBike')}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 max-w-[20ch] font-display-hero text-display-hero-mobile leading-[1.08] text-white md:text-[52px]">
              {bike.title}
            </h1>
          </Container>
        </div>
      </header>

      <Container size="wide" className="py-10 md:py-14">
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* --- the copy column ------------------------------------------- */}
          <div className="min-w-0">
            {bike.description ? (
              <p className="max-w-[62ch] font-body-lg text-body-lg text-on-surface-variant">
                {bike.description}
              </p>
            ) : null}

            {facts.length ? (
              <dl className="mt-10 grid grid-cols-1 gap-6 border-t border-hairline pt-8 sm:grid-cols-2 xl:grid-cols-3">
                {facts.map((fact) => (
                  <Fact key={fact.label} icon={fact.icon} label={fact.label} value={fact.value} />
                ))}
              </dl>
            ) : null}

            {/* --- the price ladder ---------------------------------------- */}
            {isRental && bike.rentalPricing.length ? (
              <Section title={b('ratesTitle')} className="mt-12">
                {/*
                  The same packages the planner prices from, laid out as a table so the
                  ladder can be read at a glance — the planner answers "what will my
                  hours cost", this answers "what are the rates".
                */}
                <ul className="grid gap-3 sm:grid-cols-2">
                  {bike.rentalPricing.map((band) => (
                    <li
                      key={`${band.durationLabel}-${band.durationHours}`}
                      className={cn(
                        'flex items-baseline justify-between gap-4 rounded-xl border p-4 transition-colors duration-200',
                        band.popular
                          ? 'border-brand/40 bg-brand/[0.05]'
                          : 'border-hairline bg-surface-container-lowest',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-body-md text-body-md text-primary">
                          {band.durationLabel}
                        </p>
                        {band.note ? (
                          <p className="mt-0.5 font-body-md text-caption text-on-surface-variant">
                            {band.note}
                          </p>
                        ) : null}
                      </div>
                      <Price
                        amount={band.price}
                        currencies={settings.currencies}
                        className="shrink-0 font-headline-card text-headline-card tabular-nums text-primary"
                      />
                    </li>
                  ))}
                </ul>

                {bike.pricing.hourlyRate && bike.pricing.pricingMode !== 'bands' ? (
                  <p className="mt-4 font-body-md text-caption text-on-surface-variant">
                    {b('hourlyNote')}{' '}
                    <Price
                      amount={bike.pricing.hourlyRate}
                      currencies={settings.currencies}
                      className="font-medium text-primary"
                    />
                  </p>
                ) : null}
              </Section>
            ) : null}

            {/* --- what comes with it -------------------------------------- */}
            {isRental && bike.includedAccessories.length ? (
              <Section title={t('accessories')} className="mt-12">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {bike.includedAccessories.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/[0.08] text-brand"
                      >
                        <Icon name="check" className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {/* --- the route ------------------------------------------------ */}
            {!isRental && bike.routePlan.length ? (
              <Section title={t('stops')} className="mt-12">
                <ol className="relative space-y-8 ps-8">
                  {/* One continuous rule behind the markers, drawn once. */}
                  <span
                    aria-hidden
                    className="absolute bottom-2 start-[7px] top-2 w-px bg-hairline"
                  />
                  {bike.routePlan.map((stop) => (
                    <li key={stop.stopName} className="relative">
                      <span
                        aria-hidden
                        className="absolute -start-8 top-1.5 grid h-[15px] w-[15px] place-items-center rounded-full border-2 border-brand bg-background"
                      />
                      {stop.distanceFromStartKm !== null ? (
                        <p className="mb-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
                          {stop.distanceFromStartKm} km
                        </p>
                      ) : null}
                      <h3 className="font-headline-card text-headline-card text-primary">
                        {stop.stopName}
                      </h3>
                      {stop.stopDescription ? (
                        <p className="mt-2 max-w-[62ch] font-body-md text-body-md text-on-surface-variant">
                          {stop.stopDescription}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </Section>
            ) : null}

            {/* --- start times ---------------------------------------------- */}
            {!isRental && bike.startTimes.length ? (
              <Section title={t('startTimes')} className="mt-12">
                <ul className="flex flex-wrap gap-2">
                  {bike.startTimes.map((time) => (
                    <li
                      key={time}
                      className="rounded-full border border-hairline px-4 py-2 font-body-md text-body-md tabular-nums text-on-surface-variant"
                    >
                      {time}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {/* --- gallery --------------------------------------------------- */}
            {gallery.length ? (
              <Section title={t('gallery')} className="mt-12">
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {gallery.map((image, index) => (
                    <li
                      key={image.url}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-container"
                    >
                      <CmsImage
                        image={image}
                        alt=""
                        sizes="(min-width: 768px) 22vw, 45vw"
                        // Below the fold on every viewport, so it stays lazy — these
                        // must not compete with the hero for the LCP.
                        className="object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <span className="sr-only">
                        {t('galleryCount', { current: String(index + 1), total: String(gallery.length) })}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Section title={t('cancellationPolicy')}>
              <div className="max-w-2xl">
                <CancellationPolicy override={bike.cancellationPolicy} />
              </div>
            </Section>
          </div>

          {/* --- the booking column ---------------------------------------- */}
          <aside className="min-w-0">
            {/*
              Sticky from `lg` up, where there is a column beside it to scroll past.
              `top-24` clears the sticky header; the height cap plus its own scrollport
              keep a tall planner reachable on a short viewport.
            */}
            <div className="lg:sticky lg:top-24">
              {isRental ? (
                <RentalPlanner
                  id={bike.id}
                  slug={bike.slug}
                  title={bike.title}
                  image={bike.image?.url ?? null}
                  pricing={bike.pricing}
                  bands={bike.rentalPricing}
                  pickupSlots={bike.pickupSlots}
                  deposit={bike.deposit}
                  inventory={bike.inventory}
                  currencies={settings.currencies}
                />
              ) : (
                <GuidedRidePlanner
                  id={bike.id}
                  slug={bike.slug}
                  title={bike.title}
                  image={bike.image?.url ?? null}
                  durationHours={bike.durationHours}
                  pricePerPerson={bike.pricePerPerson}
                  startTimes={bike.startTimes}
                  guideIncluded={bike.guideIncluded}
                  bikeIncluded={bike.bikeIncluded}
                  minAge={bike.minAge}
                  maxGroupSize={bike.maxGroupSize}
                  currencies={settings.currencies}
                />
              )}
            </div>
          </aside>
        </div>
      </Container>
    </div>
  )
}

export default BicycleDetailPage
