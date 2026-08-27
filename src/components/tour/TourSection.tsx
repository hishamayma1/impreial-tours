import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * One content section of a tour page.
 *
 * The `id` doubles as the anchor target for the section nav, and `scroll-mt-32`
 * clears both the site header and the sticky nav — without it, jumping to a section
 * parks its heading underneath them.
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
  <section id={id} className={cn('scroll-mt-32 py-12 md:py-16', className)}>
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
