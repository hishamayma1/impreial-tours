import { cn } from '@/lib/utils'

/**
 * shadcn/ui's Skeleton, matching its API exactly: a div you size with utilities.
 *
 * Skeletons exist to hold layout, not to entertain — every skeleton in this codebase
 * is sized to the real element it stands in for, so the swap costs zero layout shift.
 * `aria-hidden` keeps the placeholder out of the accessibility tree; the surrounding
 * Suspense boundary is what screen readers should announce.
 */
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    aria-hidden
    className={cn('animate-pulse rounded-lg bg-surface-container-highest', className)}
    {...props}
  />
)
