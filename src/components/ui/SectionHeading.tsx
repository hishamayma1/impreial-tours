import { TypingText } from '@/components/ui/TypingText'
import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  body?: string
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
  className?: string
  headingId?: string
  /**
   * Types the title and body out when the heading scrolls into view.
   *
   * Opt-in per section rather than on by default: one band that types is a flourish,
   * every band that types is a tic. The `<h2>` and `<p>` elements stay put and only
   * their text is animated, so the heading id, the `aria-labelledby` wiring and the
   * document outline are untouched.
   */
  typing?: boolean
}

export const SectionHeading = ({
  eyebrow,
  title,
  body,
  align = 'center',
  tone = 'dark',
  className,
  headingId,
  typing = false,
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
      {typing ? <TypingText text={title} speed={48} /> : title}
    </h2>
    {body ? (
      <p
        className={cn(
          'font-body-lg text-body-lg mt-6',
          // `mx-auto` centres nothing without a width to centre within, so the measure cap
          // and the auto margins have to travel together. Callers that want a different
          // measure override it with a `[&>p]:max-w-*` class, which wins on specificity.
          align === 'center' && 'mx-auto max-w-2xl',
          tone === 'dark' ? 'text-on-surface-variant' : 'text-white/85',
        )}
      >
        {typing ? (
          // Starts after the title above it has finished, so the block reads
          // top-to-bottom instead of both lines racing each other.
          <TypingText text={body} speed={16} startDelay={title.length * 48 + 220} />
        ) : (
          body
        )}
      </p>
    ) : null}
  </div>
)
