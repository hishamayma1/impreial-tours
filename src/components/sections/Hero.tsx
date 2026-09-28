import { ButtonLink } from '@/components/ui/Button'
import { CmsImage } from '@/components/ui/CmsImage'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { HomePageVM } from '@/types/content'

import { SearchWidget, type DestinationOption } from './SearchWidget'

type HeroProps = {
  hero: HomePageVM['hero']
  /** Published destinations, offered by the search widget's destination picker. */
  destinations: DestinationOption[]
  /** Localised chrome. Passed in so the Hero itself stays free of translation calls. */
  labels: {
    primaryCta: string
    secondaryCta: string
    trust: Array<{ icon: IconName; label: string }>
  }
}

/**
 * `-mt-20` cancels the header's height.
 *
 * The Header is `sticky`, not `fixed`, so it stays in normal flow and reserves its
 * full 80px at the top of the document — which put a band of page background above a
 * hero meant to run edge to edge from the very top of the viewport. Pulling the hero
 * up by exactly that height closes the gap and lets the transparent bar sit over the
 * photograph, which is what the design intends. The header carries `z-50` against the
 * hero's `z-10`/`z-30`, so it stays above and clickable.
 *
 * Nothing clips at section level. The search widget hangs half its own height below
 * the hero's bottom edge (`translate-y-1/2`), and Services reserves top padding for
 * exactly that overhang (a smaller amount below `md`, where the widget is a short
 * one-line trigger rather than the full form — see the comment there) — so an
 * `overflow-hidden` here sheared the widget in two along the section boundary, taking
 * the inputs and the submit button with it. The clipping lives on the image layer
 * instead, which is the only child that ever needed it.
 *
 * Done here rather than by making the Header `fixed`: that would take it out of flow
 * for every inner page too, and PageHeader's 64px top padding is less than the 80px
 * of header, so those titles would slide underneath it.
 */
export const Hero = ({ hero, destinations, labels }: HeroProps) => (
  <section className="relative -mt-20 flex h-[92svh] min-h-[620px] md:h-[92vh] w-full items-center justify-center sm:min-h-[720px]">
    <div className="absolute inset-0 overflow-hidden">
      <CmsImage image={hero.image} alt="" sizes="100vw" priority />
    </div>

    {/*
      Two scrims, not one. The vertical gradient carries the headline and the search
      widget's shoulders; the flat wash guarantees a floor of contrast even where an
      editor uploads a bright midday sky, so the white type is never left to chance.
    */}
    <div
      aria-hidden
      className="absolute inset-0 bg-gradient-to-b from-brand/70 via-brand/25 to-brand/80"
    />
    <div aria-hidden className="absolute inset-0 bg-brand/10" />

    <div className="relative z-10 mx-auto mt-[-4vh] flex w-full max-w-7xl flex-col items-center px-6 md:mt-[-6vh] md:px-grid-margin">
      {/*
        No subtitle under the headline: the hero is kept to the headline, the two
        CTAs and the trust strip. `hero.subtitle` is still read by the page metadata
        as the description fallback, so it is only dropped from the visible hero.
      */}
      <h1 className="mb-8 max-w-4xl text-balance text-center font-display-hero text-[30px] leading-[1.15] text-white drop-shadow-lg sm:text-[36px] sm:leading-[1.1] md:mb-10 md:text-[60px]">
        {hero.title}
      </h1>

      {/*
        The hero used to end at the headline, leaving the search widget as the only
        way out of it — a dead end for anyone who does not yet know their destination.
        Two explicit exits: browse the catalogue, or hand us the trip to plan.
      */}
      <div className="flex w-full max-w-sm flex-col items-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:gap-4">
        <ButtonLink
          href="/tours/daily"
          size="lg"
          className="w-full justify-center border border-white bg-white text-brand shadow-widget hover:bg-white/90 sm:w-auto"
        >
          {labels.primaryCta}
          <Icon name="arrow-right" className="h-4 w-4" />
        </ButtonLink>

        {/*
          A same-page jump to the enquiry form rather than a route change: the visitor
          keeps their place, and the click costs no navigation.
        */}
        <a
          href="#plan"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/10 px-8 py-4 font-body-md font-medium text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:w-auto"
        >
          <Icon name="sparkle" className="h-4 w-4" />
          {labels.secondaryCta}
        </a>
      </div>

      {/* Reassurance directly under the CTAs, where the hesitation actually happens. */}
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:mt-10 md:gap-x-6 md:gap-y-3">
        {labels.trust.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 font-body-md text-caption text-white/80"
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>

    <div className="absolute bottom-0 left-0 z-30 w-full translate-y-1/2 px-6 md:px-4">
      <SearchWidget defaultDestination={hero.defaultDestination} destinations={destinations} />
    </div>
  </section>
)
