import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { DestinationVM, SectionHeadingVM } from '@/types/content'
import { cn } from '@/lib/utils'

type FeaturedDestinationsProps = {
  heading: SectionHeadingVM
  destinations: DestinationVM[]
  exploreLabel: (name: string) => string
}

export const FeaturedDestinations = ({
  heading,
  destinations,
  exploreLabel,
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
          className="mb-12"
        />

        <ul className="grid grid-cols-1 gap-grid-gutter md:grid-cols-3">
          {destinations.map((destination, position) => (
            <li
              key={destination.id}
              className={cn(position % 2 === 1 && 'md:-translate-y-8')}
            >
              <Link
                href={`/destinations/${destination.slug}`}
                aria-label={exploreLabel(destination.name)}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <CmsImage
                  image={destination.image}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                />
                <div className="absolute bottom-6 left-6 flex w-[calc(100%-48px)] items-center justify-between">
                  <h3 className="font-headline-card text-headline-card text-white">
                    {destination.name}
                  </h3>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Icon name="arrow-right" className="h-5 w-5 text-white" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
