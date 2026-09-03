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
  | 'check'
  | 'shield'
  | 'sparkle'
  | 'whatsapp'
  | 'mail'
  | 'phone'
  | 'clock'
  | 'star'
  | 'bolt'
  | 'plus'
  | 'minus'
  | 'truck'
  | 'gauge'
  | 'mountain'
  | 'alert-triangle'

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
  check: <path d="m4 12.5 5 5L20 6.5" />,
  shield: (
    <>
      <path d="M12 2.5 4 6v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V6l-8-3.5Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9l2-6.5Z" />
      <path d="M19 3v3M20.5 4.5h-3" />
    </>
  ),
  /* Filled glyph: the WhatsApp mark is illegible as a 1.6px stroke at 20px. */
  whatsapp: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3.1 4c-.2 0-.5 0-.7.4-.3.4-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.2.2 2 3.2 5 4.3 2.4.9 2.9.7 3.4.7.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3l-2-1c-.3-.1-.5-.2-.7.1l-.9 1.2c-.2.2-.4.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.1-.3 0-.4.2-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2c-.2-.5-.4-.5-.6-.5h-.5Z"
    />
  ),
  mail: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M6.5 2.5h-2A2 2 0 0 0 2.5 5c0 8.6 6.9 15.5 15.5 15.5a2 2 0 0 0 2.5-2v-2l-4.5-1.5-2 2.5a15.7 15.7 0 0 1-6-6l2.5-2L6.5 2.5Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5V12l3.5 2" />
    </>
  ),
  star: (
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  ),
  /* Pedal assist, on a bike card and in the filter rail. */
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z" strokeLinejoin="round" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  /* Delivery to the hotel. */
  truck: (
    <>
      <path d="M3 6.5h10v9H3zM13 9.5h3.5l3 3.5v2.5H13z" strokeLinejoin="round" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 17a9 9 0 1 1 16 0" strokeLinecap="round" />
      <path d="m12 13 3.5-3.5" strokeLinecap="round" />
    </>
  ),
  mountain: <path d="m3 19 6-11 4 7 2.5-4L21 19H3Z" strokeLinejoin="round" />,
  'alert-triangle': (
    <>
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.5h.01" />
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
