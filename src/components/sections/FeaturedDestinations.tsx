import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionCta } from '@/components/ui/SectionCta'
import type { DestinationVM, SectionHeadingVM } from '@/types/content'

/** The band's closing action. Hrefs are decided by the server wrapper. */
type SectionCtaVM = { primary: { label: string; href: string }; secondary?: { label: string; href: string } }

type FeaturedDestinationsProps = {
  heading: SectionHeadingVM
  destinations: DestinationVM[]
  exploreLabel: (name: string) => string
  cta: SectionCtaVM
}

export const FeaturedDestinations = ({
  heading,
  destinations,
  exploreLabel,
  cta,
}: FeaturedDestinationsProps) => {
  if (destinations.length === 0) return null

  return (
    <section
      className="bg-surface-container-low py-section-v-padding"
      aria-labelledby="destinations-heading"
    >
      <Container>
        <SectionHeading
          headingId="destinations-heading"
          eyebrow={heading.eyebrow}
          title={heading.title}
          body={heading.body}
          // The one band on the page that types itself in.
          typing
          className="mb-12"
        />

        {/*
          `items-stretch` with a fixed card aspect keeps all three tops and bottoms on
          one line. The previous layout lifted every second card by 8 units, which read
          as a broken grid rather than as deliberate rhythm once the cards carried
          copy of differing lengths.
        */}
        <ul className="grid grid-cols-1 items-stretch gap-grid-gutter md:grid-cols-3">
          {destinations.map((destination) => (
            <li key={destination.id} className="h-full">
              {/*
                A destination is a filter over the tours, not a page of its own.
                `/destinations/<slug>` was linked here but no such route exists, so all
                three cards 404'd. Pointing them at the day-tours listing pre-filtered
                by this destination answers "what can I do in Luxor" with real
                inventory, and the URL is shareable and crawlable because the listing
                renders server-side from `searchParams`.
              */}
              <Link
                href={`/tours/daily?destination=${destination.slug}`}
                aria-label={exploreLabel(destination.name)}
                className="group relative block h-full overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-container-high">
                  <CmsImage
                    image={destination.image}
                    alt=""
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/*
                    A deeper, taller scrim than before. The copy is now two elements
                    rather than one word, so it needs a guaranteed dark field to sit
                    on whatever the editor uploads.
                  */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-brand via-brand/50 to-transparent opacity-95"
                  />

                  <span className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Icon name="arrow-right" className="h-5 w-5" />
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="font-headline-card text-headline-card text-white">
                      {destination.name}
                    </h3>

                    {destination.summary ? (
                      <p className="mt-3 font-body-md text-caption leading-relaxed text-white/75">
                        {destination.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <SectionCta primary={cta.primary} secondary={cta.secondary} className="mt-14" />
      </Container>
    </section>
  )
}
