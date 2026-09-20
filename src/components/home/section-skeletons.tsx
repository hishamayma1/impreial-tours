import { CardCarousel } from '@/components/ui/CardCarousel'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

/**
 * Holds the hero's exact height so nothing below it moves when it resolves.
 *
 * The `-mt-20` must match Hero's: this is the Suspense fallback the hero replaces, so
 * any difference in offset is a layout shift on the LCP element itself.
 */
export const HeroSkeleton = () => (
  <section className="relative -mt-20 flex h-[92vh] min-h-[720px] w-full items-center justify-center">
    <Skeleton className="absolute inset-0 rounded-none" />
    <div className="relative z-10 mx-auto mt-[-6vh] flex w-full max-w-7xl flex-col items-center px-6 md:px-grid-margin">
      <Skeleton className="mb-6 h-16 w-full max-w-3xl" />
      <Skeleton className="mb-10 h-6 w-full max-w-xl" />
      {/* The two hero CTAs and the trust strip below them. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Skeleton className="h-14 w-52" />
        <Skeleton className="h-14 w-52" />
      </div>
      <Skeleton className="mt-10 h-4 w-72" />
    </div>
  </section>
)

/**
 * Mirrors the Services bento: a two-column feature card followed by one-up cards, at
 * the same aspect ratios and breakpoints. The generic SectionSkeleton no longer fits
 * that band — it would hold a two-up grid of 4:3 cards and then shift on resolve.
 */
export const ServicesSkeleton = ({ count = 5 }: { count?: number }) => (
  <section className="pb-section-v-padding pt-[220px] md:pt-[180px]">
    <Container>
      <Skeleton className="mx-auto mb-4 h-3 w-28" />
      <Skeleton className="mx-auto mb-16 h-8 w-72" />
      <CardCarousel as="div" className="md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={index === 0 ? 'md:col-span-2 lg:col-span-2' : undefined}>
            <Skeleton
              className={cn(
                'w-full rounded-2xl',
                index === 0 ? 'aspect-[4/5] md:aspect-[16/10]' : 'aspect-[4/5]',
              )}
            />
          </div>
        ))}
      </CardCarousel>
    </Container>
  </section>
)

/**
 * Column tracks are Tailwind classes, not an inline `grid-template-columns`.
 *
 * The inline style this replaces applied at every breakpoint, so a two- or
 * three-column skeleton rendered as two or three ~100px slivers on a phone and then
 * snapped to a single column when the real section arrived.
 *
 * Only the `md`-and-up tracks are named now. Below that the band is a carousel, not a
 * grid, and `CardCarousel` owns the phone metrics for the skeleton and the real
 * section alike — so there is exactly one place either can go wrong.
 */
const columnClasses: Record<2 | 3, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
}

/** Generic band used for the below-the-fold home sections. */
export const SectionSkeleton = ({ columns = 3 }: { columns?: 2 | 3 }) => (
  <section className="py-[120px]">
    <Container>
      <Skeleton className="mx-auto mb-4 h-3 w-28" />
      <Skeleton className="mx-auto mb-12 h-8 w-72" />
      <CardCarousel as="div" className={columnClasses[columns]}>
        {Array.from({ length: columns }, (_, index) => (
          <div key={index}>
            <Skeleton className="mb-4 aspect-[4/3] w-full" />
            <Skeleton className="mb-2 h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </CardCarousel>
    </Container>
  </section>
)

/**
 * The offers band is a 4/6 split — heading column beside the carousel — not a card
 * grid, and it sits on the tinted surface. The generic skeleton stood in with two
 * equal cards on white, so the whole band changed colour and proportion on resolve.
 */
export const OffersSkeleton = () => (
  <section className="bg-surface-container-low py-[120px]">
    <Container className="grid grid-cols-1 items-center gap-grid-gutter md:grid-cols-10">
      <div className="md:col-span-4">
        <Skeleton className="mb-4 h-3 w-24" />
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="mb-2 h-4 w-full max-w-sm" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>
      <div className="md:col-span-6">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      </div>
    </Container>
  </section>
)

/**
 * The enquiry band: a copy column beside a form card, on the navy surface. Sized to
 * the real thing rather than reused from the generic band, because this one is the
 * page's last section — anything it shifts on resolve, it shifts under a reader who
 * has already scrolled all the way down to it.
 */
export const PlanJourneySkeleton = () => (
  <section className="bg-brand py-section-v-padding">
    <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-grid-gutter">
      <div className="lg:col-span-6 xl:col-span-5">
        <Skeleton className="mb-5 h-8 w-40 rounded-full bg-white/15" />
        <Skeleton className="mb-4 h-10 w-full max-w-md bg-white/15" />
        <Skeleton className="mb-8 h-5 w-3/4 max-w-sm bg-white/15" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-64 bg-white/10" />
          <Skeleton className="h-5 w-72 bg-white/10" />
          <Skeleton className="h-5 w-56 bg-white/10" />
        </div>
        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-8">
          <Skeleton className="h-12 bg-white/10" />
          <Skeleton className="h-12 bg-white/10" />
          <Skeleton className="h-12 bg-white/10" />
        </div>
      </div>
      <div className="lg:col-span-6 xl:col-span-7">
        <Skeleton className="h-[34rem] w-full rounded-3xl bg-white/15" />
      </div>
    </Container>
  </section>
)

/**
 * The spotlight band: a left-aligned heading with the tab strip opposite it, then a
 * three-up grid of 4:5 photo cards on navy. Tinted for that ground, since the grey
 * generic skeleton would flash a light block across a full-bleed dark section.
 */
export const TopToursSkeleton = ({ count = 3 }: { count?: number }) => (
  <section className="bg-brand py-section-v-padding">
    <Container>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Skeleton className="mb-4 h-3 w-28 bg-white/15" />
          <Skeleton className="mb-4 h-8 w-80 bg-white/15" />
          <Skeleton className="h-5 w-full max-w-md bg-white/10" />
        </div>
        <Skeleton className="h-14 w-64 self-start rounded-full bg-white/10 lg:self-auto" />
      </div>

      <CardCarousel as="div" className="mt-12 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full rounded-[28px] bg-white/10" />
        ))}
      </CardCarousel>
    </Container>
  </section>
)

/**
 * Testimonials render as one centred quote on the navy band, so the placeholder is
 * tinted for that background — the light grey generic skeleton flashed a white block
 * across a full-bleed dark section.
 */
export const TestimonialsSkeleton = () => (
  <section className="bg-brand py-section-v-padding">
    <Container size="narrow" className="flex flex-col items-center text-center">
      <Skeleton className="mb-8 h-3 w-32 bg-white/15" />
      <Skeleton className="mb-4 h-8 w-full max-w-2xl bg-white/15" />
      <Skeleton className="mb-12 h-8 w-3/4 max-w-xl bg-white/15" />
      <Skeleton className="mb-4 h-16 w-16 rounded-full bg-white/15" />
      <Skeleton className="mb-2 h-5 w-40 bg-white/15" />
      <Skeleton className="h-4 w-28 bg-white/15" />
    </Container>
  </section>
)
