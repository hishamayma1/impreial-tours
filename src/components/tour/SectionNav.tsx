import { Container } from '@/components/ui/Container'

/**
 * In-page navigation for a tour.
 *
 * Plain anchor links, deliberately. A scroll-spy that highlights the current section
 * needs a scroll listener or an IntersectionObserver on every section — real
 * JavaScript on a page whose whole point is that it ships almost none. The links work
 * without it, they are shareable, and they work before hydration.
 *
 * Horizontally scrollable on small screens rather than wrapping, so the bar stays one
 * row tall and never pushes the content down.
 */
export const SectionNav = ({
  items,
  label,
}: {
  items: Array<{ id: string; label: string }>
  label: string
}) => {
  if (items.length < 2) return null

  return (
    <nav
      aria-label={label}
      className="sticky top-20 z-30 border-b border-hairline bg-surface-container-lowest/90 backdrop-blur-md"
    >
      <Container>
        <ul className="-mx-1 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="focus-card block whitespace-nowrap rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:bg-surface-container hover:text-brand"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  )
}
