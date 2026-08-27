'use client'

import { useEffect, useRef, useState } from 'react'

import { usePathname } from '@/i18n/navigation'
import { useUIStore } from '@/stores'
import { cn } from '@/lib/utils'

/**
 * The chrome around the Header's server-rendered contents.
 *
 * Header itself stays a Server Component — nav items, branding and the CTA are read
 * from the CMS and must not ship as props to the client. Only this shell is
 * interactive, and it publishes its state as data attributes on the <header> so the
 * server-rendered children can restyle themselves with `group-data-*` variants
 * instead of receiving the state through React.
 *
 * Three behaviours:
 *
 * - `data-state="overlay" | "solid"`. Overlay is transparent chrome over the hero
 *   photograph; solid is the white bar used everywhere else. A page opts into overlay
 *   by rendering an element marked `data-hero-zone`; pages without a hero (every
 *   inner route) are solid from the first paint, because white-on-white nav text over
 *   a light page background is unreadable.
 * - `data-hidden`. The bar slides away on a downward scroll and returns on the way
 *   up, so a long listing gives its full height to content without costing a scroll
 *   back to the top to navigate. Suppressed while the mobile sheet is open — hiding
 *   the bar would take its own close button with it.
 * - `--scroll-progress`, a 0–1 read of how far down the document the reader is, used
 *   by the hairline under the bar.
 */
export const HeaderShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const mobileNavOpen = useUIStore((state) => state.mobileNavOpen)
  const ref = useRef<HTMLElement>(null)

  /**
   * Starts solid, and only a page that actually has a hero flips it to overlay.
   * Getting this wrong in the safe direction costs a single frame of navy-on-white
   * chrome over the photo; the other way round is invisible white-on-white text.
   */
  const [overlay, setOverlay] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)

  /** Does this route have a hero for the bar to sit over? */
  useEffect(() => {
    setOverlay(Boolean(document.querySelector('[data-hero-zone]')))
  }, [pathname])

  useEffect(() => {
    const header = ref.current
    if (!header) return

    let frame = 0
    let last = window.scrollY

    const measure = () => {
      frame = 0
      const y = window.scrollY
      const zone = document.querySelector('[data-hero-zone]')

      /**
       * With a hero, the bar turns solid as the hero's foot passes under it; without
       * one, as soon as the page moves at all. `getBoundingClientRect` is read once
       * per animation frame, never per scroll event, so this stays off the critical
       * path even on a trackpad flick.
       */
      const trigger = zone ? zone.getBoundingClientRect().bottom - header.offsetHeight : 8
      setScrolled(zone ? trigger <= 0 : y > trigger)

      // Below the fold only, and never far enough up to strand a mid-scroll reader.
      const goingDown = y > last && y > 240
      setHidden(goingDown && !mobileNavOpen)
      last = y

      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      header.style.setProperty(
        '--scroll-progress',
        scrollable > 0 ? String(Math.min(1, y / scrollable)) : '0',
      )
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [pathname, mobileNavOpen])

  const solid = !overlay || scrolled

  return (
    <header
      ref={ref}
      data-state={solid ? 'solid' : 'overlay'}
      data-hidden={hidden && !mobileNavOpen ? '' : undefined}
      className={cn(
        'group/header sticky top-0 z-50 w-full',
        'transition-[transform,background-color,box-shadow,border-color] duration-300 ease-out',
        'data-[hidden]:-translate-y-full',
        solid
          ? 'border-b border-outline-variant/40 bg-surface-container-lowest/90 shadow-nav backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      {children}

      {/*
        Reading progress. Painted with `scaleX` off a CSS variable rather than a width,
        so every frame is a compositor transform and none of them lays the page out.
      */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-brand opacity-0 transition-opacity duration-300 group-data-[state=solid]/header:opacity-100"
        style={{ transform: 'scaleX(var(--scroll-progress, 0))' }}
      />
    </header>
  )
}
