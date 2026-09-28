import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionCta } from '@/components/ui/SectionCta'
import type { OfferVM, SectionHeadingVM } from '@/types/content'

import { OffersCarousel } from './OffersCarousel'

/** The band's closing action. Hrefs are decided by the server wrapper. */
type SectionCtaVM = { primary: { label: string; href: string }; secondary?: { label: string; href: string } }

type OffersProps = {
  heading: SectionHeadingVM
  offers: OfferVM[]
  cta: SectionCtaVM
}

/**
 * Hides itself when no tour currently carries an offer, the same way Services and the
 * other CMS-driven bands do. A tinted full-width band containing only a "no offers"
 * message is worse than no band: offers are seasonal, and the home page should close
 * over the gap rather than announce it.
 */
export const Offers = ({ heading, offers, cta }: OffersProps) => {
  if (offers.length === 0) return null

  return (
    <section className="bg-surface-container-low py-16 md:py-[120px]" aria-labelledby="offers-heading">
      <Container className="grid grid-cols-1 items-center gap-8 md:grid-cols-10 md:gap-grid-gutter">
        {/*
          `contents` below `md` lets the heading, the carousel and the CTAs reorder as
          siblings in the one-column grid: on a phone the two stacked full-width
          buttons would otherwise sit between the heading and the offers it introduces,
          pushing the slides a whole screen further down.
        */}
        <div className="contents md:col-span-4 md:block">
          <SectionHeading
            headingId="offers-heading"
            eyebrow={heading.eyebrow}
            title={heading.title}
            body={heading.body}
            align="left"
            className="[&>p]:max-w-sm"
          />

          {/*
            Beside the heading rather than under the carousel: the carousel's own
            "Discover" button already speaks for the slide on screen, and a second
            button directly below it would read as a duplicate of it rather than as
            the way through to everything else.
          */}
          <SectionCta
            primary={cta.primary}
            secondary={cta.secondary}
            align="left"
            className="order-2 md:order-none md:mt-8"
          />
        </div>
        <div className="order-1 md:order-none md:col-span-6">
          <OffersCarousel offers={offers} />
        </div>
      </Container>
    </section>
  )
}
