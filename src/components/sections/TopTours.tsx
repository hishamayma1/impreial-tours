import { CardCarousel } from '@/components/ui/CardCarousel'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SectionCta } from '@/components/ui/SectionCta'
import { SpotlightTourCard } from '@/components/services/SpotlightTourCard'
import type { CurrencyVM, SectionHeadingVM } from '@/types/content'
import type { SpotlightTourVM } from '@/types/services'

import { SpotlightTabs, type SpotlightTab } from './SpotlightTabs'

type SectionCtaVM = {
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
}

type TopToursProps = {
  heading: SectionHeadingVM
  groups: { new: SpotlightTourVM[]; top: SpotlightTourVM[] }
  currencies: CurrencyVM[]
  labels: { tabNew: string; tabTop: string; tablist: string }
  cta: SectionCtaVM
}

/**
 * "New & Top Tours" — the band that answers the two questions a returning visitor and
 * a first-time visitor each arrive with: what is new since I last looked, and what is
 * everyone else booking.
 *
 * On the navy field rather than the white one. The page alternates surfaces down its
 * length, and this band sits between the white Services bento and the tinted Offers
 * carousel, so a dark band is what keeps those two from running together — and photo
 * cards read far better cut out of a dark ground than floated on a light one.
 */
const Grid = ({
  tours,
  currencies,
}: {
  tours: SpotlightTourVM[]
  currencies: CurrencyVM[]
}) => (
  <CardCarousel className="sm:grid-cols-2 lg:grid-cols-3">
    {tours.map((tour, index) => (
      <li key={`${tour.spotlight}-${tour.id}`} className="h-full">
        <SpotlightTourCard item={tour} currencies={currencies} index={index} />
      </li>
    ))}
  </CardCarousel>
)

export const TopTours = ({ heading, groups, currencies, labels, cta }: TopToursProps) => {
  // Nothing published yet: render nothing rather than an empty band with a heading.
  if (groups.new.length === 0 && groups.top.length === 0) return null

  // A tab with nothing behind it is dropped rather than rendered empty.
  const candidates: Array<SpotlightTab | null> = [
    groups.new.length
      ? { id: 'new', label: labels.tabNew, panel: <Grid tours={groups.new} currencies={currencies} /> }
      : null,
    groups.top.length
      ? { id: 'top', label: labels.tabTop, panel: <Grid tours={groups.top} currencies={currencies} /> }
      : null,
  ]
  const tabs = candidates.filter((tab): tab is SpotlightTab => tab !== null)

  return (
    <section className="relative overflow-hidden bg-brand py-section-v-padding" aria-labelledby="top-tours-heading">
      {/*
        Two soft radial washes, drawn behind everything. They keep a full-bleed navy
        band from reading as a flat rectangle without costing an image request, and
        being pure gradient they cost nothing to paint.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-brand-light/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-on-tertiary-container/10 blur-3xl"
      />

      <Container className="relative">
        {/*
          The heading is handed to the switcher rather than placed beside it: the tab
          strip and the panels it controls have to be siblings, and the strip shares
          its row with the title while the panels run the full width underneath.
        */}
        <SpotlightTabs
          tabs={tabs}
          groupLabel={labels.tablist}
          header={
            <SectionHeading
              headingId="top-tours-heading"
              eyebrow={heading.eyebrow}
              title={heading.title}
              body={heading.body}
              align="left"
              tone="light"
              className="max-w-2xl [&>p]:mt-4"
            />
          }
        />

        <SectionCta
          primary={cta.primary}
          secondary={cta.secondary}
          tone="light"
          className="mt-16"
        />
      </Container>
    </section>
  )
}
