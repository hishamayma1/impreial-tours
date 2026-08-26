import { Link } from '@/i18n/navigation'
import { Icon } from '@/components/ui/Icon'
import { buttonStyles } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Action = { label: string; href: string }

type SectionCtaProps = {
  /** The action this band is actually for. */
  primary: Action
  /** The lower-commitment alternative, for anyone not ready to browse. */
  secondary?: Action
  /** `light` is for CTAs sitting on the navy bands. */
  tone?: 'dark' | 'light'
  align?: 'left' | 'center'
  className?: string
}

/**
 * The closing action on a home page band.
 *
 * Every section used to end at its last card, which left the visitor to work out for
 * themselves what came next — the whole page was browsable and none of it asked for
 * anything. One component rather than a hand-rolled pair of buttons per section, so
 * the pairing, the spacing and the hover behaviour stay identical down the page: a
 * CTA that looks slightly different each time reads as a different kind of thing.
 */
const CtaLink = ({ action, className }: { action: Action; className: string }) => {
  const content = (
    <>
      {action.label}
      <Icon
        name="arrow-right"
        className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1"
      />
    </>
  )

  /**
   * An in-page target is a plain anchor. The locale-aware `Link` would rewrite `#plan`
   * to `/en#plan`, turning a free same-page jump into a full navigation.
   */
  return action.href.startsWith('#') ? (
    <a href={action.href} className={className}>
      {content}
    </a>
  ) : (
    <Link href={action.href} className={className}>
      {content}
    </Link>
  )
}

export const SectionCta = ({
  primary,
  secondary,
  tone = 'dark',
  align = 'center',
  className,
}: SectionCtaProps) => {
  const shared = 'group/cta justify-center'

  const primaryClass = buttonStyles({
    variant: tone === 'light' ? 'outlineLight' : 'navy',
    size: 'lg',
    // On navy, a navy button is invisible; the filled white pill is the primary there.
    className: cn(shared, tone === 'light' && 'border-white bg-white text-brand hover:bg-white/90'),
  })

  const secondaryClass = buttonStyles({
    variant: tone === 'light' ? 'outlineLight' : 'outlineNavy',
    size: 'lg',
    className: shared,
  })

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:gap-4',
        align === 'center' ? 'sm:justify-center' : 'sm:justify-start',
        className,
      )}
    >
      <CtaLink action={primary} className={primaryClass} />
      {secondary ? <CtaLink action={secondary} className={secondaryClass} /> : null}
    </div>
  )
}
