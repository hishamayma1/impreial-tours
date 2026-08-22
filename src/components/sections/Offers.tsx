import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { OfferVM, SectionHeadingVM } from '@/types/content'

import { OffersCarousel } from './OffersCarousel'

type OffersProps = {
  heading: SectionHeadingVM
  offers: OfferVM[]
}

export const Offers = ({ heading, offers }: OffersProps) => (
  <section className="bg-surface-container-low py-[120px]" aria-labelledby="offers-heading">
    <Container className="grid grid-cols-1 items-center gap-grid-gutter md:grid-cols-10">
      <div className="md:col-span-4">
        <SectionHeading
          headingId="offers-heading"
          eyebrow={heading.eyebrow}
          title={heading.title}
          body={heading.body}
          align="left"
          className="[&>p]:max-w-sm"
        />
      </div>
      <div className="md:col-span-6">
        <OffersCarousel offers={offers} />
      </div>
    </Container>
  </section>
)
