import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  className?: string
}

/**
 * The h1 band that opens every inner page. The home page keeps its own full-bleed
 * hero — this is the quieter variant used by listings, detail pages and forms.
 */
export const PageHeader = ({ eyebrow, title, description, className }: PageHeaderProps) => (
  <div className={cn('border-b border-outline-variant/40 bg-surface-container-low', className)}>
    <Container className="py-16 md:py-24">
      {eyebrow ? (
        <span className="mb-4 block font-label-caps text-label-caps uppercase tracking-widest text-brand">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-display-hero text-display-hero-mobile text-primary md:text-headline-section">
        {title}
      </h1>
      {description ? (
        <p className="mt-6 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
          {description}
        </p>
      ) : null}
    </Container>
  </div>
)
