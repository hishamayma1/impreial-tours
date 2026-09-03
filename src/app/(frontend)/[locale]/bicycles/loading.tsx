import {
  BicycleFiltersSkeleton,
  BicycleGridSkeleton,
} from '@/components/bicycles/BicycleSkeletons'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Shown the instant a navigation to this route starts, before the server has sent
 * anything. Mirrors the real page's two-column structure — same rail width, same
 * gutter, same grid — so the transition is a fill-in rather than a re-layout.
 */
const Loading = () => (
  <div className="aurora">
    <header className="border-b border-white/40">
      <Container className="py-14 md:py-20">
        <div className="glass-panel max-w-3xl rounded-2xl p-8 md:p-10">
          <Skeleton className="mb-4 h-7 w-32 rounded-full" />
          <Skeleton className="mb-3 h-12 w-4/5" />
          <Skeleton className="h-6 w-full max-w-lg" />
          <div className="mt-8 grid gap-4 border-t border-hairline pt-6 sm:grid-cols-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </Container>
    </header>

    <Container size="wide" className="py-10 md:py-14">
      <div className="grid grid-cols-1 gap-x-12 gap-y-0 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <BicycleFiltersSkeleton />
        <div className="min-w-0">
          <BicycleGridSkeleton />
        </div>
      </div>
    </Container>
  </div>
)

export default Loading
