import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeletons for the bicycles listing.
 *
 * Each mirrors the real component's box model — same aspect ratio, same paddings, same
 * number of rows — so nothing moves when the data arrives. A skeleton that is not the
 * size of its replacement trades a spinner for layout shift, which is the more
 * expensive of the two.
 */

/** Matches BicycleCard: 16:11 media, title, summary, fact row, price ladder, footer. */
export const BicycleCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest">
    <Skeleton className="aspect-[16/11] w-full rounded-none" />
    <div className="p-6">
      <Skeleton className="mb-2.5 h-7 w-4/5" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="mt-5 flex items-end justify-between gap-4 border-t border-hairline pt-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  </div>
)

/** Matches the results column: count row, sort control, then the card grid. */
export const BicycleGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div>
    <div className="mb-8 flex items-center justify-between gap-4 border-b border-hairline pb-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-11 w-44" />
    </div>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <BicycleCardSkeleton key={index} />
      ))}
    </div>
  </div>
)

/**
 * Matches the filter rail: heading, search field, then a run of collapsed groups.
 *
 * Desktop only — below `lg` the rail is a single trigger button, and the sheet behind
 * it is not rendered until it is opened, so there is nothing there to stand in for.
 */
export const BicycleFiltersSkeleton = () => (
  <div className="hidden lg:block lg:pe-2">
    <div className="flex items-center justify-between pb-5">
      <Skeleton className="h-7 w-28" />
    </div>
    <Skeleton className="h-11 w-full rounded-xl" />
    <div className="mt-5 space-y-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="border-t border-hairline/70 pt-5">
          <Skeleton className="mb-4 h-3.5 w-24" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

/** The detail page's rental planner, which is the heaviest thing on that route. */
export const RentalPlannerSkeleton = () => (
  <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-6">
    <Skeleton className="mb-5 h-6 w-40" />
    <Skeleton className="mb-3 h-11 w-full rounded-xl" />
    <div className="mb-5 flex gap-2">
      <Skeleton className="h-9 w-20 rounded-full" />
      <Skeleton className="h-9 w-24 rounded-full" />
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
    <Skeleton className="mb-5 h-2 w-full rounded-full" />
    <Skeleton className="h-24 w-full rounded-xl" />
    <Skeleton className="mt-5 h-12 w-full rounded-xl" />
  </div>
)
