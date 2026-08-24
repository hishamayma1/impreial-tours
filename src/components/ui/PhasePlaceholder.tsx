import { Container } from '@/components/ui/Container'

/**
 * Phase 1 renders the routing skeleton only — every route resolves, carries correct
 * metadata and is reachable from the nav. This block marks the spot where the real
 * data-driven UI lands in a later phase, so a click-through never dead-ends on a
 * blank page.
 */
export const PhasePlaceholder = ({ note }: { note: string }) => (
  <Container className="py-20">
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
      <p className="font-body-md text-body-md text-on-surface-variant">{note}</p>
    </div>
  </Container>
)
