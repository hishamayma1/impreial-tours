import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import type { ImageVM } from '@/types/content'

export const DetailHero = ({
  eyebrow,
  title,
  summary,
  image,
}: {
  eyebrow?: string
  title: string
  summary?: string
  image: ImageVM | null
}) => (
  <header>
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-container md:aspect-[21/9]">
      <CmsImage
        image={image}
        alt={title}
        sizes="100vw"
        // The only above-the-fold image on a detail page, so it is the LCP element.
        priority
        className="object-cover"
      />
    </div>
    <Container className="py-10 md:py-14">
      {eyebrow ? (
        <span className="mb-3 block font-label-caps text-label-caps uppercase tracking-widest text-brand">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-display-hero text-display-hero-mobile text-primary md:text-headline-section">
        {title}
      </h1>
      {summary ? (
        <p className="mt-5 max-w-3xl font-body-lg text-body-lg text-on-surface-variant">
          {summary}
        </p>
      ) : null}
    </Container>
  </header>
)
