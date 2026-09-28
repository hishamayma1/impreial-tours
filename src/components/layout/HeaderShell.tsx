'use client'

import { useEffect, useState } from 'react'

import { usePathname } from '@/i18n/navigation'
import { useUIStore } from '@/stores'
import { cn } from '@/lib/utils'

/**
 * The chrome around the Header's server-rendered contents.
 *
 * Header itself stays a Server Component — nav items, branding and the CTA are read
 * from the CMS and must not ship as props to the client. Only this shell is
 * interactive: it owns the one piece of state the bar still has, whether it is
 * tucked away on scroll.
 *
 * The bar is a floating white pill at every width (drawn by Header's inner row); the
 * <header> itself is only a transparent 12px frame around it. It used to go
 * transparent over a hero photograph and turn white as the hero scrolled away; the
 * pill is white throughout, so there is no longer a state for the children to read.
 * Pages still carry their `data-hero-zone` markers from then; nothing reads them now.
 *
 * `data-hidden`: the bar slides away on a downward scroll and returns on the way up,
 * so a long listing gives its full height to content without costing a scroll back
 * to the top to navigate. Suppressed while the mobile sheet or a mega panel is open —
 * hiding the bar would take its own close button with it.
 */
export const HeaderShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const mobileNavOpen = useUIStore((state) => state.mobileNavOpen)
  const navPanelOpen = useUIStore((state) => state.navPanelOpen)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let frame = 0
    let last = window.scrollY

    const measure = () => {
      frame = 0
      const y = window.scrollY
      // Below the fold only, and never far enough up to strand a mid-scroll reader.
      const goingDown = y > last && y > 240
      setHidden(goingDown && !mobileNavOpen && !navPanelOpen)
      last = y
    }

    // Read once per animation frame, never per scroll event, so a trackpad flick
    // costs nothing on the critical path.
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [pathname, mobileNavOpen, navPanelOpen])

  return (
    <header
      data-hidden={hidden && !mobileNavOpen && !navPanelOpen ? '' : undefined}
      className={cn(
        // 12px frame + 56px pill + 12px frame = the 80px that the heroes' `-mt-20`
        // cancels, so a hero photograph still starts at the very top of the viewport.
        'sticky top-0 z-50 w-full p-3',
        'transition-transform duration-300 ease-out data-[hidden]:-translate-y-full',
      )}
    >
      {children}
    </header>
  )
}
