import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

/** Holds the hero's exact height so nothing below it moves when it resolves. */
export const HeroSkeleton = () => (
  <section className="relative flex h-[90vh] min-h-[700px] w-full items-center justify-center">
    <Skeleton className="absolute inset-0 rounded-none" />
    <div className="relative z-10 mx-auto mt-[-10vh] flex w-full max-w-7xl flex-col items-center px-6 md:px-grid-margin">
      <Skeleton className="mb-6 h-16 w-full max-w-3xl" />
      <Skeleton className="h-6 w-full max-w-xl" />
    </div>
  </section>
)

/**
 * Column tracks are Tailwind classes, not an inline `grid-template-columns`.
 *
 * The inline style this replaces applied at every breakpoint, so a two- or
 * three-column skeleton rendered as two or three ~100px slivers on a phone and then
 * snapped to a single column when the real section arrived. These strings mirror the
 * grids in Services (2-up), FeaturedDestinations (3-up) and Journal (2-up then 3-up)
 * exactly, so the swap costs no layout shift at any width.
 */
const columnClasses: Record<2 | 3, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}

/** Generic band used for the below-the-fold home sections. */
export const SectionSkeleton = ({ columns = 3 }: { columns?: 2 | 3 }) => (
  <section className="py-[120px]">
    <Container>
      <Skeleton className="mx-auto mb-4 h-3 w-28" />
      <Skeleton className="mx-auto mb-12 h-8 w-72" />
      <div className={cn('grid gap-grid-gutter', columnClasses[columns])}>
        {Array.from({ length: columns }, (_, index) => (
          <div key={index}>
            <Skeleton className="mb-4 aspect-[4/3] w-full" />
            <Skeleton className="mb-2 h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
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
