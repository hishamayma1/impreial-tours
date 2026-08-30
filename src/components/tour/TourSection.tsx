import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * One content section of a tour page.
 *
 * The `id` doubles as the anchor target for the section nav, and `scroll-mt-24`
 * clears the sticky site header — the nav bar itself scrolls away with the hero, so it
 * needs no room. Without it, a jump parks the heading underneath the header.
 */
export const TourSection = ({
  id,
  title,
  eyebrow,
  children,
  className,
}: {
  id: string
  title?: string
  eyebrow?: string
  children: ReactNode
  className?: string
}) => (
  <section id={id} className={cn('scroll-mt-24 py-12 md:py-16', className)}>
    {title ? (
      <header className="mb-8">
        {eyebrow ? (
          <span className="mb-2 block font-label-caps text-label-caps uppercase tracking-widest text-brand">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="font-headline-section text-headline-section text-primary">{title}</h2>
      </header>
    ) : null}
    {children}
  </section>
)
