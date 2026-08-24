import {
  PageHeaderSkeleton,
  ListingFiltersSkeleton,
  ServiceGridSkeleton,
} from '@/components/services/ServiceSkeletons'

/**
 * Shown the instant a navigation to this route starts, before the server has sent
 * anything. Mirrors the real page's structure so the transition is a fill-in rather
 * than a re-layout.
 */
const Loading = () => (
  <>
    <PageHeaderSkeleton />
    <ListingFiltersSkeleton />
    <ServiceGridSkeleton />
  </>
)

export default Loading
