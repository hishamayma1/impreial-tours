'use client'

import { useId, useState, type ReactNode } from 'react'

export type SpotlightTab = {
  id: 'new' | 'top'
  label: string
  /** Rendered on the server and handed down, so no card markup is shipped as JS. */
  panel: ReactNode
}

type SpotlightTabsProps = {
  tabs: SpotlightTab[]
  /** Accessible name for the tablist, since the visible labels are the tabs themselves. */
  groupLabel: string
  /**
   * The band's heading, rendered on the server and placed opposite the tab strip.
   *
   * It travels through this component rather than sitting beside it in the parent
   * because the strip and the panels must be siblings for the layout to work: the
   * strip shares a row with the heading, the panels run the full width underneath.
   */
  header: ReactNode
}

/**
 * The New / Top Rated switcher.
 *
 * The only client component in the band, and it holds nothing but an index: the cards
 * are server-rendered and passed in as `panel` nodes, so switching tabs costs no
 * request and no card markup travels as JavaScript. Both panels stay in the DOM with
 * the inactive one `hidden`, which keeps every tour in the initial HTML for crawlers
 * and answer engines rather than hiding half the band behind an interaction.
 *
 * Labels arrive as props rather than through `useTranslations` so this file needs no
 * message namespace shipped to the browser.
 */
export const SpotlightTabs = ({ tabs, groupLabel, header }: SpotlightTabsProps) => {
  const [active, setActive] = useState(0)
  const baseId = useId()

  /**
   * Arrow keys move between tabs, which is what the tabs pattern requires — a
   * roving tabindex means Tab itself moves past the strip into the active panel
   * instead of stepping through every tab on the way.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()

    const next = (active + delta + tabs.length) % tabs.length
    setActive(next)
    document.getElementById(`${baseId}-tab-${tabs[next].id}`)?.focus()
  }

  return (
    <>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-grid-gutter">
        {header}

        <div
          role="tablist"
          aria-label={groupLabel}
          onKeyDown={onKeyDown}
          className="inline-flex shrink-0 self-start rounded-full border border-white/15 bg-white/5 p-1.5 backdrop-blur-sm lg:self-auto"
        >
          {tabs.map((tab, index) => {
            const selected = index === active

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 font-label-caps text-label-caps uppercase tracking-widest transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand ${
                  selected ? 'bg-white text-brand shadow-sm' : 'text-white/65 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== active}
          tabIndex={0}
          className="mt-12 focus-visible:outline-none"
        >
          {tab.panel}
        </div>
      ))}
    </>
  )
}
