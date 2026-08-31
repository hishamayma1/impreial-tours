import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeletons for the hotels listing. Each mirrors its component's box model — same
 * heights, same columns — so nothing moves when the data arrives.
 */

/** Matches the filter bar's single row of 48px controls under 12px labels. */
export const HotelFiltersSkeleton = () => (
  <div className="border-y border-white/40 bg-surface-container-lowest/70">
    <Container className="flex flex-wrap items-end gap-3 py-4">
      <div className="min-w-0 flex-1 basis-64">
        <Skeleton className="mb-1.5 h-3 w-24" />
        <Skeleton className="h-12 w-full" />
      </div>
      {['basis-52', 'w-64', 'w-36'].map((width) => (
        <div key={width} className={width}>
          <Skeleton className="mb-1.5 h-3 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </Container>
  </div>
)

/** Matches HotelResults: count row and sort, then the two-up card grid. */
export const HotelGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <Container className="py-10 md:py-14">
    <div className="mb-8 flex items-center justify-between gap-4 border-b border-hairline pb-5">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-11 w-44" />
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest sm:grid sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-auto sm:h-full" />
          <div className="p-6">
            <Skeleton className="mb-3 h-6 w-3/4" />
            <Skeleton className="mb-4 h-4 w-1/2" />
            <div className="mb-5 flex gap-2">
              {[0, 1, 2].map((chip) => (
                <Skeleton key={chip} className="h-6 w-16 rounded-full" />
              ))}
            </div>
            <div className="flex items-end justify-between border-t border-hairline pt-5">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </Container>
)
