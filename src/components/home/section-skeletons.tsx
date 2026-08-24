import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'

/** Holds the hero's exact height so nothing below it moves when it resolves. */
export const HeroSkeleton = () => (
  <section className="relative flex h-[90vh] min-h-[700px] w-full items-center justify-center">
    <Skeleton className="absolute inset-0 rounded-none" />
    <div className="relative z-10 mx-auto mt-[-10vh] flex w-full max-w-7xl flex-col items-center px-6">
      <Skeleton className="mb-6 h-16 w-full max-w-3xl" />
      <Skeleton className="h-6 w-full max-w-xl" />
    </div>
  </section>
)

/** Generic band used for the below-the-fold home sections. */
export const SectionSkeleton = ({ columns = 3 }: { columns?: number }) => (
  <section className="py-[120px]">
    <Container>
      <Skeleton className="mx-auto mb-4 h-3 w-28" />
      <Skeleton className="mx-auto mb-12 h-8 w-72" />
      <div
        className="grid gap-grid-gutter"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
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
