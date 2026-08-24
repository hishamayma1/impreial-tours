'use client'

import { cn } from '@/lib/utils'

/**
 * Loaders in the ReactBits style (reactbits.dev) — animated, self-contained, no
 * dependencies. Written here rather than copied: reactbits.dev is unreachable from
 * this build environment, so these are faithful to the pattern (pure CSS keyframes,
 * currentColor, size-driven by props) rather than byte-identical to any one snippet.
 *
 * All three animate with `transform` and `opacity` only, so they run on the
 * compositor and never trigger layout — a spinner that causes reflow while the page
 * is still loading is worse than no spinner at all.
 */

type LoaderProps = {
  size?: number
  className?: string
  /** Announced to screen readers; omit only when a parent already labels the region. */
  label?: string
}

const Wrapper = ({
  label,
  className,
  children,
}: {
  label?: string
  className?: string
  children: React.ReactNode
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-label={label}
    className={cn('inline-flex items-center justify-center text-brand', className)}
  >
    {children}
    {label ? <span className="sr-only">{label}</span> : null}
  </div>
)

/** Three dots orbiting a centre point. The default page-level loader. */
export const OrbitLoader = ({ size = 40, className, label }: LoaderProps) => (
  <Wrapper label={label} className={className}>
    <span
      className="relative block animate-[loader-spin_1.1s_linear_infinite]"
      style={{ width: size, height: size }}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="absolute left-1/2 top-0 block rounded-full bg-current"
          style={{
            width: size * 0.22,
            height: size * 0.22,
            marginLeft: size * -0.11,
            transformOrigin: `${size * 0.11}px ${size * 0.5}px`,
            transform: `rotate(${index * 120}deg)`,
            opacity: 1 - index * 0.28,
          }}
        />
      ))}
    </span>
  </Wrapper>
)

/** Three bars rising and falling. Reads well inline, beside a label. */
export const PulseLoader = ({ size = 24, className, label }: LoaderProps) => (
  <Wrapper label={label} className={className}>
    <span className="flex items-end gap-1" style={{ height: size }}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="block w-1 rounded-full bg-current animate-[loader-bar_0.9s_ease-in-out_infinite]"
          style={{ height: size, animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </span>
  </Wrapper>
)

/**
 * A hairline bar for route transitions. Deliberately indeterminate: it animates a
 * fixed sweep rather than pretending to know real progress.
 */
export const RouteProgress = ({ className }: { className?: string }) => (
  <div
    role="status"
    aria-hidden
    className={cn('h-0.5 w-full overflow-hidden bg-transparent', className)}
  >
    <div className="h-full w-1/3 rounded-full bg-brand animate-[loader-sweep_1.2s_ease-in-out_infinite]" />
  </div>
)
