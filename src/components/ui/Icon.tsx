import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Hand-authored stroke icons. The Stitch export pulled in the Material Symbols
 * webfont; inlining the handful of glyphs we actually use removes a render-blocking
 * font request and the icon-name flash that comes with it.
 */
export type IconName =
  | 'pin'
  | 'calendar'
  | 'search'
  | 'compass'
  | 'infinity'
  | 'bed'
  | 'bike'
  | 'anchor'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'arrow-right'
  | 'wallet'
  | 'globe'
  | 'menu'
  | 'close'
  | 'users'

const paths: Record<IconName, React.ReactNode> = {
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.9-3.9" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m16.2 7.8-2.1 6.4-6.3 2.1 2.1-6.4 6.3-2.1Z" />
    </>
  ),
  infinity: (
    <path d="M18.2 8c-3.1 0-4.7 4-6.2 4S8.9 8 5.8 8a4 4 0 1 0 0 8c3.1 0 4.7-4 6.2-4s3.1 4 6.2 4a4 4 0 1 0 0-8Z" />
  ),
  bed: (
    <>
      <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
      <path d="M2 16h20M6 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5.5 17.5 9 10h5l4.5 7.5M9 10l3 7.5" />
    </>
  ),
  anchor: (
    <>
      <circle cx="12" cy="5" r="3" />
      <path d="M12 22V8M5 12H2a10 10 0 0 0 20 0h-3" />
    </>
  ),
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'arrow-right': <path d="M5 12h14m-7-7 7 7-7 7" />,
  wallet: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M16.5 14.5h.01" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5a15 15 0 0 1 4 9.5 15 15 0 0 1-4 9.5 15 15 0 0 1-4-9.5 15 15 0 0 1 4-9.5Z" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  users: (
    <>
      <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 20v-2a4 4 0 0 0-3-3.9" />
    </>
  ),
}

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  /** Accessible label. Omit for purely decorative icons. */
  title?: string
}

export const Icon = ({ name, title, className, ...rest }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    className={cn('h-6 w-6 shrink-0', className)}
    {...rest}
  >
    {title ? <title>{title}</title> : null}
    {paths[name]}
  </svg>
)
