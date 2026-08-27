import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeletons for the service listings and detail pages.
 *
 * Each one mirrors the real component's box model — same aspect ratio, same paddings,
 * same number of rows — so when the data arrives nothing moves. That is the whole
 * point: a skeleton that is not the size of its replacement trades a spinner for
 * layout shift, which is the more expensive of the two.
 */

/** Matches ServiceCard: 4:3 media, meta line, title, three summary lines, price row. */
export const ServiceCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-hairline bg-surface-container-lowest">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="p-6">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-4 h-6 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-5 flex items-end justify-between gap-4 border-t border-hairline pt-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  </div>
)

/** Matches ServiceGrid's 1/2/3-column grid at the default page size. */
export const ServiceGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <Container className="py-16 md:py-20">
    <div className="grid grid-cols-1 gap-grid-gutter sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <ServiceCardSkeleton key={index} />
      ))}
    </div>
  </Container>
)

/**
 * Matches the filter bar's height so the grid below never jumps when it resolves:
 * same 16px block padding, same 44px controls under a 12px label, and the widths
 * follow the real row — destination, difficulty segments, price range, then sort
 * pushed to the far end.
 */
export const ListingFiltersSkeleton = () => (
  <div className="border-y border-hairline bg-surface-container-low">
    <Container className="flex flex-wrap items-end gap-x-4 gap-y-4 py-4">
      {['w-52', 'w-72', 'w-44'].map((width) => (
        <div key={width} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className={`h-11 ${width}`} />
        </div>
      ))}
      <div className="flex flex-col gap-1.5 md:ml-auto">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-11 w-56" />
      </div>
    </Container>
  </div>
)

/** Matches PageHeader: eyebrow, h1, one description line. */
export const PageHeaderSkeleton = () => (
  <div className="border-b border-hairline bg-surface-container-low">
    <Container className="py-16 md:py-24">
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className="mb-6 h-10 w-2/3 max-w-lg" />
      <Skeleton className="h-5 w-full max-w-2xl" />
    </Container>
  </div>
)

/**
 * Matches DetailHero's 16:9 (21:9 on desktop) media band plus its title block.
 * The `-mt-20` mirrors DetailHero's, so the route's loading state sits at the same
 * offset as the page that replaces it and the swap shifts nothing.
 */
export const DetailHeroSkeleton = () => (
  <div className="-mt-20">
    <Skeleton className="aspect-[16/9] w-full rounded-none md:aspect-[21/9]" />
    <Container className="py-10 md:py-14">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-5 h-10 w-3/4 max-w-2xl" />
      <Skeleton className="h-5 w-full max-w-3xl" />
    </Container>
  </div>
)

/** Matches a DetailSection with a FactRow and a couple of paragraphs. */
export const DetailBodySkeleton = () => (
  <>
    <section className="border-b border-hairline py-12 md:py-16">
      <Container>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index}>
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </Container>
    </section>
    <section className="border-b border-hairline py-12 md:py-16">
      <Container>
        <div className="max-w-3xl space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </Container>
    </section>
  </>
)

/** Matches the room/price rows on a hotel detail page. */
export const RoomListSkeleton = ({ count = 2 }: { count?: number }) => (
  <div className="space-y-6">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="rounded-xl border border-hairline bg-surface-container-lowest p-6">
        <Skeleton className="mb-3 h-6 w-1/3" />
        <Skeleton className="mb-5 h-4 w-2/3" />
        <div className="grid grid-cols-3 gap-4 border-t border-hairline pt-4">
          {[0, 1, 2].map((cell) => (
            <div key={cell}>
              <Skeleton className="mb-2 h-3 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)
