import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { SectionHeadingVM, ServiceVM } from '@/types/content'

/** Maps the CMS icon choice onto the inline icon set. */
const iconFor = (icon: string | null): IconName | null => {
  switch (icon) {
    case 'explore':
      return 'compass'
    case 'all-inclusive':
      return 'infinity'
    case 'hotel':
      return 'bed'
    case 'bike':
      return 'bike'
    case 'sailing':
      return 'anchor'
    default:
      return null
  }
}

type ServicesProps = {
  heading: SectionHeadingVM
  services: ServiceVM[]
}

export const Services = ({ heading, services }: ServicesProps) => {
  if (services.length === 0) return null

  return (
    <Container as="section" className="pb-section-v-padding pt-[180px]" aria-labelledby="services-heading">
      <SectionHeading
        headingId="services-heading"
        eyebrow={heading.eyebrow}
        title={heading.title}
        className="mb-16"
      />

      <div className="grid grid-cols-1 gap-grid-gutter md:grid-cols-2">
        {services.map((service) => {
          const icon = iconFor(service.icon)
          return (
            <Link
              key={service.id}
              href={service.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="relative h-48 overflow-hidden">
                <CmsImage
                  image={service.image}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8">
                {icon ? (
                  <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-brand shadow-sm">
                    <Icon name={icon} className="h-7 w-7" />
                  </span>
                ) : null}
                <h3 className="mb-4 font-headline-card text-headline-card text-primary">
                  {service.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {service.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </Container>
  )
}
