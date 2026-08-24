import { PageHeaderSkeleton } from '@/components/services/ServiceSkeletons'
import { OrbitLoader } from '@/components/ui/Loader'
import { Container } from '@/components/ui/Container'

const Loading = () => (
  <>
    <PageHeaderSkeleton />
    <Container className="flex justify-center py-24">
      <OrbitLoader size={44} />
    </Container>
  </>
)

export default Loading
