import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  body?: string
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
  className?: string
  headingId?: string
}

export const SectionHeading = ({
  eyebrow,
  title,
  body,
  align = 'center',
  tone = 'dark',
  className,
  headingId,
}: SectionHeadingProps) => (
  <div className={cn(align === 'center' && 'text-center', className)}>
    {eyebrow ? (
      <span
        className={cn(
          'font-label-caps text-label-caps uppercase tracking-widest block mb-4',
          tone === 'dark' ? 'text-brand' : 'text-inverse-primary',
        )}
      >
        {eyebrow}
      </span>
    ) : null}
    <h2
      id={headingId}
      className={cn(
        'font-headline-section text-headline-section',
        tone === 'dark' ? 'text-primary' : 'text-white',
      )}
    >
      {title}
    </h2>
    {body ? (
      <p
        className={cn(
          'font-body-lg text-body-lg mt-6',
          align === 'center' && 'mx-auto',
          tone === 'dark' ? 'text-on-surface-variant' : 'text-white/85',
        )}
      >
        {body}
      </p>
    ) : null}
  </div>
)
