import { Container } from '@/components/ui/Container'

type Stat = { value: string; label: string }

type ListingHeroProps = {
  eyebrow?: string
  title: string
  description?: string
  stats?: Stat[]
}

/**
 * The editorial header for a service listing.
 *
 * Two deliberate typographic choices:
 *  - The heading is capped at ~18 characters per line via `max-w-[18ch]` rather than a
 *    pixel width, so the measure holds when German runs a third longer than English.
 *  - Body copy is capped at 62ch, inside the 45–75ch band where continuous prose is
 *    comfortable to read.
 *
 * The stat rail is optional and only renders facts we actually have — an empty
 * database produces a clean header, not a row of zeroes.
 */
export const ListingHero = ({ eyebrow, title, description, stats = [] }: ListingHeroProps) => (
  <header className="relative overflow-hidden border-b border-hairline bg-surface-container-low">
    {/* A single soft radial wash. Pure CSS, no image request, no layout cost. */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.055] [background:radial-gradient(60rem_28rem_at_15%_-10%,theme(colors.brand.DEFAULT),transparent_70%)]"
    />

    <Container className="relative py-16 md:py-24">
      <div className="max-w-3xl">
        {eyebrow ? (
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-container-lowest px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
            {eyebrow}
          </span>
        ) : null}

        <h1 className="max-w-[18ch] font-display-hero text-display-hero-mobile leading-[1.08] text-primary md:text-[56px]">
          {title}
        </h1>

        {description ? (
          <p className="mt-6 max-w-[62ch] font-body-lg text-body-lg text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>

      {stats.length ? (
        <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 border-t border-hairline pt-8 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label}>
              <dt className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                {item.label}
              </dt>
              <dd className="mt-1.5 font-display-hero text-headline-card text-primary">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Container>
  </header>
)
