import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { normaliseWhatsappNumber } from '@/lib/whatsapp'
import type { ContactVM, SectionHeadingVM } from '@/types/content'

import { PlanJourneyForm } from './PlanJourneyForm'

type PlanJourneyProps = {
  heading: SectionHeadingVM
  contact: ContactVM
  labels: {
    /** Three short reasons to answer the form rather than close the tab. */
    benefits: string[]
    /** Figures that make the promise above them credible. */
    stats: Array<{ value: string; label: string }>
    orReachUs: string
    whatsapp: string
    call: string
    email: string
  }
}

const channelClass =
  'inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 ' +
  'font-body-md text-body-md text-white/90 backdrop-blur-sm transition-colors duration-200 ' +
  'hover:border-white hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

const Channel = ({ href, icon, label }: { href: string; icon: IconName; label: string }) => (
  <a href={href} className={channelClass} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
    <Icon name={icon} className="h-4 w-4" />
    {label}
  </a>
)

/**
 * The home page's conversion band, and the section that replaced the journal.
 *
 * The journal was three cards linking to `/journal/<slug>` — a route family that was
 * never built, so the last thing on the home page was three dead ends. This asks for
 * the enquiry instead, at the point where a visitor who has just scrolled the
 * services, the offers, the destinations and the testimonials is at their most
 * convinced and has, until now, had nothing to do about it.
 *
 * Two ways to answer, because they suit different people: the form for anyone happy
 * to be called back, and the direct channels for anyone who wants an answer now.
 * Both are given equal visual weight; neither is hidden behind the other.
 */
export const PlanJourney = ({ heading, contact, labels }: PlanJourneyProps) => {
  const whatsapp = normaliseWhatsappNumber(contact.whatsappNumber)

  return (
    <section
      // The hero's secondary CTA jumps here, so the id has to be stable.
      id="plan"
      className="relative overflow-hidden bg-brand py-section-v-padding"
      aria-labelledby="plan-heading"
    >
      {/*
        Two soft radial washes lift the flat navy without costing an image request.
        Purely decorative, and `pointer-events-none` so they never eat a click meant
        for the form sitting on top of them.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-light/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-[32rem] w-[32rem] rounded-full bg-inverse-primary/10 blur-3xl"
      />

      <Container className="relative z-10 grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-grid-gutter">
        <div className="lg:col-span-6 xl:col-span-5">
          {heading.eyebrow ? (
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-white backdrop-blur-sm">
              <Icon name="sparkle" className="h-3.5 w-3.5" />
              {heading.eyebrow}
            </span>
          ) : null}

          <h2
            id="plan-heading"
            className="font-headline-section text-[32px] leading-tight text-white md:text-[44px]"
          >
            {heading.title}
          </h2>

          {heading.body ? (
            <p className="mt-5 max-w-lg font-body-lg text-body-lg text-white/80">{heading.body}</p>
          ) : null}

          <ul className="mt-8 space-y-3">
            {labels.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 font-body-md text-body-md text-white/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-8">
            {labels.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display-hero text-2xl text-white md:text-3xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 block font-body-md text-caption text-white/60">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          {/*
            Rendered only for the channels an editor has actually filled in — a "call
            us" chip with no number behind it is worse than no chip at all.
          */}
          {whatsapp || contact.phone || contact.email ? (
            <div className="mt-10">
              <span className="mb-3 block font-label-caps text-label-caps uppercase tracking-widest text-white/50">
                {labels.orReachUs}
              </span>
              <div className="flex flex-wrap gap-3">
                {whatsapp ? (
                  <Channel href={`https://wa.me/${whatsapp}`} icon="whatsapp" label={labels.whatsapp} />
                ) : null}
                {contact.phone ? (
                  <Channel href={`tel:${contact.phone.replace(/\s/g, '')}`} icon="phone" label={labels.call} />
                ) : null}
                {contact.email ? (
                  <Channel href={`mailto:${contact.email}`} icon="mail" label={labels.email} />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-6 xl:col-span-7">
          <PlanJourneyForm />
        </div>
      </Container>
    </section>
  )
}
