import type { ReactNode } from 'react'

import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/utils'

export const DetailSection = ({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) => (
  <section className={cn('border-b border-hairline py-12 md:py-16', className)}>
    <Container>
      {title ? (
        <h2 className="mb-6 font-headline-card text-headline-card text-primary">{title}</h2>
      ) : null}
      {children}
    </Container>
  </section>
)

/** A simple bulleted list used for highlights, inclusions and accessories. */
export const CheckList = ({ items, muted = false }: { items: string[]; muted?: boolean }) => {
  if (!items.length) return null

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 font-body-md text-body-md text-on-surface-variant"
        >
          <span aria-hidden className={muted ? 'text-outline' : 'text-brand'}>
            {muted ? '×' : '✓'}
          </span>
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Label/value pairs for durations, group sizes, check-in times and the like. */
export const FactRow = ({ facts }: { facts: Array<{ label: string; value: string }> }) => {
  const visible = facts.filter((fact) => Boolean(fact.value))
  if (!visible.length) return null

  return (
    <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {visible.map((fact) => (
        <div key={fact.label}>
          <dt className="mb-1 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            {fact.label}
          </dt>
          <dd className="font-body-lg text-body-lg text-primary">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
