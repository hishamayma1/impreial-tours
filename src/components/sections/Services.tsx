import { Link } from '@/i18n/navigation'
import { CardCarousel } from '@/components/ui/CardCarousel'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionCta } from '@/components/ui/SectionCta'
import { cn } from '@/lib/utils'
import type { SectionHeadingVM, ServiceVM } from '@/types/content'

/** Maps the CMS icon choice onto the inline icon set. */
const iconFor = (icon: string | null): IconName | null => {
  switch (icon) {
    case 'explore':
      return 'compass'
    case 'all-inclusive':
      return 'infinity'
    case 'hotel':
      return 'bed'
    case 'bike':
      return 'bike'
    case 'sailing':
      return 'anchor'
    case 'transfer':
      return 'pin'
    default:
      return null
  }
}

/**
 * Bento sizing.
 *
 * The first service is the feature card and takes two columns; the rest sit one-up.
 * The number of services is editor-controlled, so a fixed layout eventually strands a
 * card alone in a half-empty final row — these two corrections stretch the last card
 * to close whichever row it lands in, at each breakpoint independently.
 *
 * Cell arithmetic: the feature occupies 2 cells and every other card 1, so a list of
 * `total` services fills `total + 1` cells.
 */
const spanFor = (index: number, total: number): string => {
  if (index === 0) return 'md:col-span-2 lg:col-span-2'
  if (index !== total - 1) return ''

  const cells = total + 1
  return cn(cells % 2 === 1 && 'md:col-span-2', cells % 3 === 1 && 'lg:col-span-3', cells % 3 === 2 && 'lg:col-span-2')
}

/** The band's closing action. Hrefs are decided by the server wrapper. */
type SectionCtaVM = { primary: { label: string; href: string }; secondary?: { label: string; href: string } }

type ServicesProps = {
  heading: SectionHeadingVM
  services: ServiceVM[]
  /** Localised call to action shown on every card. */
  exploreLabel: string
  cta: SectionCtaVM
}

export const Services = ({ heading, services, exploreLabel, cta }: ServicesProps) => {
  if (services.length === 0) return null

  return (
    <Container
      as="section"
      // Reserves room for SearchWidget's overhang off the bottom of the Hero above
      // (see Hero.tsx). Below `md`, SearchWidget renders as a short one-line trigger
      // rather than the full form, so it needs less room than the desktop widget, not
      // more — but it is a different height, so it still needs its own value here.
      className="pb-section-v-padding pt-[220px] md:pt-[180px]"
      aria-labelledby="services-heading"
    >
      <SectionHeading
        headingId="services-heading"
        eyebrow={heading.eyebrow}
        title={heading.title}
        className="mb-16"
      />

      <CardCarousel className="md:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => {
          const icon = iconFor(service.icon)
          const isFeature = index === 0

          return (
            <li key={service.id} className={spanFor(index, services.length)}>
              <Link
                href={service.href}
                className="group relative block overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <div
                  className={cn(
                    'relative w-full overflow-hidden bg-surface-container-high',
                    // Portrait everywhere on mobile so the column reads evenly; the
                    // feature card only goes wide once there is room beside it.
                    isFeature ? 'aspect-[4/5] md:aspect-[16/10]' : 'aspect-[4/5]',
                  )}
                >
                  <CmsImage
                    image={service.image}
                    alt=""
                    sizes={
                      isFeature
                        ? '(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 66vw'
                        : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
                    }
                    className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />

                  {/*
                    Two stacked scrims rather than one: a strong foot to carry the
                    copy, and a light wash over the whole frame so the index and icon
                    stay legible against a pale sky. Text over photography is only
                    accessible if the darkening is guaranteed rather than hoped for.
                  */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-brand via-brand/55 to-transparent opacity-90"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-brand/10 transition-opacity duration-500 group-hover:opacity-0"
                  />

                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
                    <span className="font-label-caps text-label-caps uppercase tracking-widest text-white/60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {icon ? (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-colors duration-300 group-hover:bg-white group-hover:text-brand">
                        <Icon name={icon} className="h-5 w-5" />
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <h3
                      className={cn(
                        'font-headline-card text-white',
                        isFeature ? 'text-3xl md:text-4xl' : 'text-headline-card',
                      )}
                    >
                      {service.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 max-w-md font-body-md text-body-md text-white/75">
                      {service.description}
                    </p>

                    <span className="mt-6 inline-flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest text-white">
                      {exploreLabel}
                      <Icon
                        name="arrow-right"
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </CardCarousel>

      <SectionCta primary={cta.primary} secondary={cta.secondary} className="mt-14" />
    </Container>
  )
}
