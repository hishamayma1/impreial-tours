import {
  CatalogGridSkeleton,
  CatalogSidebarSkeleton,
} from '@/components/services/CatalogSkeletons'
import { PageHeaderSkeleton } from '@/components/services/ServiceSkeletons'
import { Container } from '@/components/ui/Container'

/**
 * Shown the instant a navigation to the catalogue starts, before the server has sent
 * anything. Mirrors the real page's two-column structure — same rail width, same
 * gutter, same grid — so the transition is a fill-in rather than a re-layout.
 */
const Loading = () => (
  <>
    <PageHeaderSkeleton />
    <Container size="wide" className="py-10 md:py-14">
      <div className="grid grid-cols-1 gap-x-12 gap-y-0 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <CatalogSidebarSkeleton />
        <div className="min-w-0">
          <CatalogGridSkeleton />
        </div>
      </div>
    </Container>
  </>
)

export default Loading
