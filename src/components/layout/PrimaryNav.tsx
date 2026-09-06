'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'

import { Icon, type IconName } from '@/components/ui/Icon'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores'
import type { NavItemVM } from '@/types/content'

type PrimaryNavProps = {
  items: NavItemVM[]
  /**
   * Server-rendered recommendation rails, handed in as slots keyed by the hub's own
   * `href`. Passing them as nodes rather than as data keeps the tour/hotel cards —
   * and the queries behind them — on the server; this component never learns what a
   * tour or a hotel is, only which hub is currently open.
   */
  featuredByHub?: Record<string, ReactNode>
}

/**
 * Link colour is read from the header's `data-state`, not from a prop: over the hero
 * the bar is transparent and the links must be white, and once it turns solid they
 * must be navy on white. Publishing that as a data attribute is what lets the labels
 * stay server-rendered strings.
 */
const triggerBase =
  'relative inline-flex items-center gap-1 font-body-md text-body-md tracking-wider transition-colors duration-300 ' +
  'text-white/85 hover:text-white ' +
  'group-data-[state=solid]/header:text-on-surface-variant group-data-[state=solid]/header:hover:text-brand'

/**
 * The hover rule is a scaled pseudo-element rather than `text-decoration`, so it
 * animates on the compositor and never reflows the line it sits under.
 */
const underline =
  'after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 ' +
  'after:bg-current after:transition-transform after:duration-300 ' +
  'hover:after:origin-left hover:after:scale-x-100 focus-visible:after:scale-x-100'

const focusRing =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-4 focus-visible:ring-offset-transparent'

/** The panel's zone heading. NavRecommendations matches it for its own rail. */
const sectionLabel =
  'font-label-caps text-label-caps uppercase tracking-[0.14em] text-on-surface-variant'

/**
 * A vertical link row rather than a card: the hubs read as a list to scan top to
 * bottom, which is what leaves the panel's width free for the recommendation rail
 * instead of splitting it three or four ways into cramped tiles.
 */
const tileClass =
  'group/tile relative flex items-center gap-3.5 rounded-xl px-3 py-2.5 ' +
  'transition-colors duration-200 hover:bg-surface-container-low ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'

const tileIconClass =
  'grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/[0.07] text-brand transition-colors duration-200 ' +
  'group-hover/tile:bg-brand group-hover/tile:text-on-primary'

/** Hidden until hover, then slides in from the label — a cheap way to signal "go". */
const tileArrowClass =
  'h-4 w-4 shrink-0 -translate-x-1 text-outline opacity-0 transition-all duration-200 ' +
  'group-hover/tile:translate-x-0 group-hover/tile:text-brand group-hover/tile:opacity-100 rtl:rotate-180'

/**
 * A glyph for a destination, chosen from its path.
 *
 * Purely presentational — it gives each tile something to recognise before the label
 * is read, which is most of what makes a menu feel navigable rather than like a list.
 * Matched longest-prefix-first, and anything unrecognised (a CMS link to a route this
 * map has never heard of) falls back to the compass rather than to a gap.
 */
const ICON_BY_PATH: Array<[string, IconName]> = [
  ['/tours/daily', 'clock'],
  ['/tours/experiences', 'calendar'],
  ['/tours', 'compass'],
  ['/hotels', 'bed'],
  ['/bicycles', 'bike'],
  ['/transfers/airport', 'globe'],
  ['/transfers/intercity', 'pin'],
  ['/transfers/custom', 'sparkle'],
  ['/transfers', 'compass'],
  ['/about', 'shield'],
  ['/contact', 'mail'],
]

const iconFor = (href: string): IconName =>
  ICON_BY_PATH.find(([path]) => href.startsWith(path))?.[1] ?? 'compass'

/**
 * The desktop primary navigation, with a full-width mega panel under each hub.
 *
 * Replaces a CSS-only hover dropdown that had two problems worth fixing rather than
 * restyling. Its trigger was a plain link, so on a touch screen the first tap
 * navigated away and the submenu was unreachable; and the menu could only ever be a
 * narrow column, because a `min-w` box anchored to a trigger has nowhere to put a
 * second dimension.
 *
 * So the panel is now a band spanning the header, positioned against the `<header>`
 * itself — it is the nearest positioned ancestor, being sticky — which is what makes
 * the width available to lay the destinations out in a row and hang a rail of
 * recommended journeys underneath them.
 *
 * Pointer and click both open it, which is the part that needs care: a click that
 * closes a menu the pointer is still sitting on would be undone by that same pointer
 * on the very next event. `suppressHover` holds the closure until the pointer
 * genuinely leaves.
 */
export const PrimaryNav = ({ items, featuredByHub }: PrimaryNavProps) => {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const [openHref, setOpenHref] = useState<string | null>(null)
  const regionRef = useRef<HTMLDivElement>(null)
  /** Set by a click-to-close, cleared when the pointer leaves the whole nav region. */
  const suppressHover = useRef(false)
  /**
   * Whether the open panel was pinned by a click rather than previewed by a hover.
   *
   * Without this the trigger is unusable with a mouse: moving onto it opens the panel,
   * so the click that follows — the one a visitor thinks is opening the menu — lands
   * on an already-open menu and a plain toggle closes it again. Hover previews, a
   * click pins, and only a click on something already pinned dismisses it.
   */
  const openedByClick = useRef(false)
  /** Which trigger to hand focus back to when the panel closes on Escape. */
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelPendingClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const close = useCallback(() => {
    cancelPendingClose()
    openedByClick.current = false
    setOpenHref(null)
  }, [cancelPendingClose])

  /**
   * Closing on pointer-leave is delayed; opening and every deliberate close is not.
   *
   * The trigger row and the panel are separate boxes with the bar's own padding
   * between them, so travelling from one to the other takes the pointer briefly
   * outside the region. Closing on that instant meant the menu vanished on the way to
   * the very thing it was opened for, and it had to be reopened to be used. The grace
   * period is short enough not to feel sticky if you really are leaving.
   */
  const scheduleClose = useCallback(() => {
    cancelPendingClose()
    closeTimer.current = setTimeout(() => {
      openedByClick.current = false
      setOpenHref(null)
    }, 140)
  }, [cancelPendingClose])

  useEffect(() => cancelPendingClose, [cancelPendingClose])

  // A navigation has happened — the destination is now on screen behind an open menu.
  useEffect(() => {
    close()
  }, [pathname, close])

  /**
   * Publish the open state so HeaderShell can force the bar solid and stop it hiding
   * on scroll. The two are siblings with no common ancestor below the header itself,
   * and the store is already how this app shares chrome state.
   */
  const setNavPanel = useUIStore((state) => state.setNavPanel)
  useEffect(() => {
    setNavPanel(openHref !== null)
    // Unmounting with the flag set would pin the bar solid for the rest of the session.
    return () => setNavPanel(false)
  }, [openHref, setNavPanel])

  useEffect(() => {
    if (!openHref) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
      triggerRefs.current.get(openHref)?.focus()
    }

    /**
     * Closes on a click anywhere outside the nav region. `pointerdown` rather than
     * `click`, so the menu is already gone by the time the click lands on whatever is
     * underneath — otherwise the first click outside only dismisses the menu and the
     * thing the visitor was aiming at needs a second one.
     */
    const onPointerDown = (event: PointerEvent) => {
      if (!regionRef.current?.contains(event.target as Node)) close()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [openHref, close])

  /**
   * Hover-to-open is for mice only. On a touch screen every tap reports as a pointer
   * enter first, so honouring it there would open the menu on the way to a tap that
   * was meant to close it.
   */
  const hoverOpens = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  return (
    <div
      ref={regionRef}
      onPointerEnter={cancelPendingClose}
      onPointerLeave={() => {
        scheduleClose()
        suppressHover.current = false
      }}
      /**
       * Any activated link inside the region closes the menu, caught here by
       * delegation rather than by an `onClick` on each link.
       *
       * The recommendation rail is server-rendered and arrives as a slot, so its links
       * cannot carry a handler of their own — and those were exactly the ones that left
       * the panel and its scrim standing over the page for the whole navigation, which
       * reads as the menu having ignored the click. Delegation covers every link in the
       * panel, whichever side of the boundary rendered it.
       */
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) close()
      }}
      className="hidden lg:block"
    >
      <nav aria-label="Primary" className="flex gap-8">
        {items.map((item) => {
          const key = `${item.href}-${item.label}`

          if (!item.children?.length) {
            return (
              <Link key={key} href={item.href} className={cn(triggerBase, underline, focusRing)}>
                {item.label}
              </Link>
            )
          }

          const isOpen = openHref === item.href

          return (
            <button
              key={key}
              ref={(node) => {
                if (node) triggerRefs.current.set(item.href, node)
                else triggerRefs.current.delete(item.href)
              }}
              type="button"
              // A button, not a link: it opens a menu, and announcing it as a
              // destination would promise a navigation that pressing it does not
              // perform. The hub itself is the first link inside the panel.
              aria-expanded={isOpen}
              aria-haspopup="true"
              aria-controls={`nav-panel-${item.href.replace(/\W+/g, '-')}`}
              onClick={() => {
                // Only a click on a panel this trigger already pinned dismisses it.
                if (isOpen && openedByClick.current) {
                  close()
                  suppressHover.current = true
                  return
                }
                openedByClick.current = true
                cancelPendingClose()
                setOpenHref(item.href)
              }}
              onPointerEnter={() => {
                if (suppressHover.current || !hoverOpens()) return
                cancelPendingClose()
                // Re-entering the trigger of a panel this same trigger already pinned
                // must not demote it back to a hover preview — the next click would
                // then re-open instead of dismissing, and the menu could never be
                // closed from its own trigger.
                if (isOpen) return
                openedByClick.current = false
                setOpenHref(item.href)
              }}
              className={cn(triggerBase, underline, focusRing)}
            >
              {item.label}
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className={cn(
                  'h-3 w-3 transition-transform duration-300',
                  isOpen && 'rotate-180',
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        })}
      </nav>

      {items.map((item) => {
        if (!item.children?.length || openHref !== item.href) return null

        // Only add a link to the hub when it is not already among its own children —
        // the Tours hub lists "All Tours" itself, Transfers does not.
        const hubListed = item.children.some((child) => child.href === item.href)
        const featuredNode = featuredByHub?.[item.href]

        return (
          <div key={item.href}>
            {/*
              A dimmed sheet over the page, from the header's foot down. It is the
              click-outside target as much as a visual: on a wide screen the gap
              between the panel and anything else is most of the window, and a menu
              that only closes when you find its trigger again reads as stuck.

              Portalled to the body, which is not fussiness. The solid header carries
              `backdrop-filter`, and that makes it a containing block for fixed
              descendants — so a `fixed inset-0` scrim rendered inside it resolved
              against the 64px bar instead of the viewport and collapsed to nothing.
              Outside the header it covers the page properly, at a z-index under the
              bar (z-50) and over everything else.

              `top-16` needs no responsive variant: opening a panel forces the header
              solid, and solid is always the 64px height.

              The pointer handlers are its own because it would otherwise sit outside
              the region whose `pointerleave` closes the menu, and outside the ref the
              outside-click test uses.
            */}
            {createPortal(
              <span
                aria-hidden
                onPointerEnter={close}
                onPointerDown={close}
                className="fixed inset-x-0 bottom-0 top-16 z-40 bg-brand/25 backdrop-blur-[1px]"
              />,
              document.body,
            )}

            <div
              id={`nav-panel-${item.href.replace(/\W+/g, '-')}`}
              /**
               * `absolute` against the `<header>`, which is the nearest positioned
               * ancestor because it is sticky. Spanning the full width is what makes a
               * horizontal layout possible at all, and it sidesteps the clamping a
               * trigger-anchored panel needs near either edge of the window.
               */
              className="absolute inset-x-0 top-full origin-top border-b border-outline-variant/40 bg-surface-container-lowest shadow-nav motion-safe:animate-[nav-panel-in_180ms_ease-out]"
            >
              <div className="mx-auto w-full max-w-[1600px] px-6 py-7 md:px-grid-margin">
                <div className={cn('grid gap-x-10 gap-y-7', featuredNode && 'lg:grid-cols-[288px_1fr]')}>
                  {/*
                    The destinations, read top to bottom as a list rather than scanned
                    across a row of cards. A vertical rail keeps a fixed, narrow width
                    whatever the hub's child count, which is what leaves the rest of
                    the band free for the recommendation grid beside it.
                  */}
                  <div className={cn(!featuredNode && 'max-w-xs')}>
                    <p className={sectionLabel}>{t('browse')}</p>

                    <ul className="mt-2">
                      {item.children.map((child) => (
                        <li key={`${child.href}-${child.label}`}>
                          <Link href={child.href} className={tileClass}>
                            <span className={tileIconClass}>
                              <Icon name={iconFor(child.href)} className="h-[18px] w-[18px]" />
                            </span>
                            <span className="flex-1 font-body-md text-body-md text-primary">
                              {child.label}
                            </span>
                            <Icon name="arrow-right" className={tileArrowClass} />
                          </Link>
                        </li>
                      ))}
                    </ul>

                    {/*
                      The hub, when it is not already one of its own children. Set off
                      by a rule and the brand fill so the list has one obvious
                      destination for someone who has not decided yet.
                    */}
                    {!hubListed ? (
                      <div className="mt-2 border-t border-hairline pt-2">
                        <Link
                          href={item.href}
                          className="group/tile flex items-center gap-3.5 rounded-xl bg-brand px-3 py-2.5 text-on-primary transition-colors duration-200 hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/15">
                            <Icon name={iconFor(item.href)} className="h-[18px] w-[18px]" />
                          </span>
                          <span className="flex-1 font-body-md text-body-md">{t('viewAll')}</span>
                          <Icon
                            name="arrow-right"
                            className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/tile:translate-x-0.5 rtl:rotate-180"
                          />
                        </Link>
                      </div>
                    ) : null}
                  </div>

                  {featuredNode ? (
                    <div className="border-l border-hairline pl-10">{featuredNode}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
