import type { CardFact } from '@/types/services'

/**
 * Inline 16px icons for card facts.
 *
 * Deliberately hand-drawn as inline SVG rather than pulled from an icon package: six
 * glyphs at ~120 bytes each cost nothing, ship no JavaScript, inherit `currentColor`,
 * and avoid the barrel-import problem that makes icon libraries expensive.
 *
 * Every icon is aria-hidden — the fact's translated label carries the meaning.
 */
const PATHS: Record<CardFact['icon'], React.ReactNode> = {
  clock: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="2" y="3.25" width="12" height="10.5" rx="1.75" />
      <path d="M2 6.75h12M5.5 1.75v2.5M10.5 1.75v2.5" strokeLinecap="round" />
    </>
  ),
  moon: <path d="M13 9.4A5.6 5.6 0 1 1 6.6 3a4.6 4.6 0 0 0 6.4 6.4Z" strokeLinejoin="round" />,
  signal: (
    <path
      d="M2.75 12.25v-2M6.25 12.25v-4.5M9.75 12.25v-7M13.25 12.25v-9.5"
      strokeLinecap="round"
    />
  ),
  users: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <path d="M1.75 13.25a4.25 4.25 0 0 1 8.5 0" strokeLinecap="round" />
      <path d="M10.5 4a2.5 2.5 0 0 1 0 4.9M11.5 13.25a4.3 4.3 0 0 0-1.1-2.9" strokeLinecap="round" />
    </>
  ),
  globe: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M2 8h12M8 1.75c1.7 1.9 2.5 4 2.5 6.25S9.7 12.4 8 14.25C6.3 12.4 5.5 10.3 5.5 8S6.3 3.6 8 1.75Z" />
    </>
  ),
  route: (
    <>
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M4 6v3.5A2.5 2.5 0 0 0 6.5 12H10" strokeLinecap="round" />
    </>
  ),
}

export const FactIcon = ({ icon, className }: { icon: CardFact['icon']; className?: string }) => (
  <svg
    aria-hidden
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    className={className ?? 'h-4 w-4 shrink-0'}
  >
    {PATHS[icon]}
  </svg>
)
