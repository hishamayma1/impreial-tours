import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Skeletons for the `/tours` catalogue.
 *
 * Each mirrors the real component's box model — same aspect ratio, same paddings,
 * same number of rows — so nothing moves when the data arrives. A skeleton that is
 * not the size of its replacement trades a spinner for layout shift, which is the
 * more expensive of the two.
 */

/** Matches CatalogCard: 3:2 media, two title lines, two summary lines, price row. */
export const CatalogCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest">
    <Skeleton className="aspect-[3/2] w-full rounded-none" />
    <div className="p-6">
      <Skeleton className="mb-2 h-6 w-4/5" />
      <Skeleton className="mb-4 h-6 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="mt-5 flex items-end justify-between gap-4 border-t border-hairline/70 pt-5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  </div>
)

/** Matches the results column: count row, sort control, then the card grid. */
export const CatalogGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div>
    <div className="mb-8 flex items-center justify-between gap-4 border-b border-hairline pb-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-11 w-44" />
    </div>
    <div className="grid grid-cols-1 gap-grid-gutter sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CatalogCardSkeleton key={index} />
      ))}
    </div>
  </div>
)

/**
 * Matches the filter rail: the mobile trigger below `lg`, and above it the heading,
 * search field and seven groups at the heights the real controls occupy.
 */
export const CatalogSidebarSkeleton = () => (
  <>
    <div className="-mx-6 mb-6 border-y border-hairline bg-surface-container-low px-6 py-3 lg:hidden">
      <Skeleton className="h-11 w-full" />
    </div>

    <div className="hidden lg:block">
      <div className="flex items-center justify-between pb-5">
        <Skeleton className="h-7 w-24" />
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="mt-5 space-y-5">
        {[0, 1, 2, 3, 4].map((group) => (
          <div key={group} className="border-t border-hairline/70 pt-5">
            <Skeleton className="mb-4 h-3 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  </>
)
