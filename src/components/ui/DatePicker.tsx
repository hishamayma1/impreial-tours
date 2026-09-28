'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from 'next-intl'
import { DayPicker, type Locale as DayPickerLocale, type Matcher as DayPickerMatcher } from 'react-day-picker'
import { de, enUS, es } from 'react-day-picker/locale'

import { Icon } from '@/components/ui/Icon'
import { usePresence } from '@/hooks/use-presence'
import { dateToISO, formatISODate, isoToDate, todayISO } from '@/lib/date'
import { cn } from '@/lib/utils'

const dayPickerLocales: Record<string, DayPickerLocale> = { en: enUS, es, de }

/** Matches Tailwind's `md` breakpoint: below it the calendar is a bottom sheet. */
const MOBILE_QUERY = '(max-width: 767px)'
const PANEL_WIDTH = 296
const PANEL_HEIGHT_ESTIMATE = 340
const EDGE_GAP = 16
/** Open/close durations, matched by the `duration-*` classes on each panel below. */
const SHEET_MS = 300
const DROPDOWN_MS = 180

export type DatePickerProps = {
  id?: string
  /** `YYYY-MM-DD`, or `''` when nothing is chosen yet. */
  value: string
  onChange: (iso: string) => void
  /** `YYYY-MM-DD`. Defaults to today — bookings never go in the past. */
  min?: string
  /** `YYYY-MM-DD`. */
  max?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  /** Hide the trailing calendar glyph — for callers that place their own icon over the field. */
  hideIcon?: boolean
  'aria-labelledby'?: string
}

/**
 * The one date input the whole site uses — a button that opens a calendar panel,
 * replacing every native `<input type="date">`. Native date inputs render a different
 * picker per browser and OS (and a barely legible one on desktop Safari/Firefox), which
 * made the booking flow look unfinished on some of the very browsers the luxury-travel
 * audience uses. This renders identically everywhere and matches the design system.
 */
export const DatePicker = ({
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled,
  invalid,
  className,
  hideIcon,
  'aria-labelledby': ariaLabelledBy,
}: DatePickerProps) => {
  const locale = useLocale()
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<{
    top: number
    left: number
    width: number
    /** Flipped above the field, so the panel grows upward from it. */
    above: boolean
  } | null>(null)
  // Below `md` the calendar opens as a bottom sheet rather than a dropdown — see the
  // render below. Read when the panel opens and on resize, not during render, so the
  // server and first client render agree.
  const [mobile, setMobile] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  // Kept mounted through the close so both panels can animate out, not just in.
  const panel = usePresence(open, mobile ? SHEET_MS : DROPDOWN_MS)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  /**
   * Outside-press dismissal, for the dropdown only. The sheet has a backdrop covering
   * everything else and closes from that backdrop's click instead: closing on
   * pointerdown there would unmount the backdrop mid-tap, and the click that follows
   * would land on whatever was underneath it — the search sheet's own backdrop, which
   * would then close the search form too.
   */
  useEffect(() => {
    if (!open || mobile) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !(panelRef.current && panelRef.current.contains(target))
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, mobile])

  // The sheet is modal, so the page under it should not scroll. The previous value is
  // restored rather than cleared, since the search sheet may already have locked it.
  useEffect(() => {
    if (!open || !mobile) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, mobile])

  /**
   * Portalled to the body and positioned in fixed coordinates from the trigger's own
   * rect — see the identical fix in PrimaryNav.tsx.
   *
   * Every caller of this component sits inside a `.glass`/`.glass-panel` ancestor
   * somewhere in the tree, and `backdrop-filter` promotes its own element onto a
   * compositor layer that paints in front of ordinary z-indexed content in some
   * browsers regardless of the numbers involved — the panel's `z-50` lost to a plain
   * sibling input two rows down purely because that input also carries
   * `backdrop-blur-sm`. Rendering outside every such ancestor removes the local
   * stacking context this bug depends on, rather than trying to out-number it.
   */
  useLayoutEffect(() => {
    if (!open) return

    const place = () => {
      setMobile(window.matchMedia(MOBILE_QUERY).matches)
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)

      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return

      // Kept inside the viewport: shifted left when the field sits near the right
      // edge, and flipped above the field when there is no room below it but there
      // is above. The height is measured once the panel exists; the estimate only
      // covers the first frame.
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 2 * EDGE_GAP)
      const height = panelRef.current?.offsetHeight ?? PANEL_HEIGHT_ESTIMATE
      const left = Math.max(EDGE_GAP, Math.min(rect.left, window.innerWidth - width - EDGE_GAP))
      const fitsBelow = rect.bottom + 8 + height <= window.innerHeight - EDGE_GAP
      const fitsAbove = rect.top - 8 - height >= EDGE_GAP
      const above = !fitsBelow && fitsAbove
      const top = above ? rect.top - 8 - height : rect.bottom + 8

      setPanelStyle({ top, left, width: rect.width, above })
    }

    place()
    // Second pass once the panel is in the DOM, so the flip uses its real height.
    const frame = window.requestAnimationFrame(place)
    window.addEventListener('resize', place)
    // `capture: true` so a scroll inside any nested scroll container repositions the
    // panel too, not only a scroll of the window itself.
    window.addEventListener('scroll', place, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const selected = value ? isoToDate(value) : undefined
  const minDate = isoToDate(min ?? todayISO())
  const maxDate = max ? isoToDate(max) : undefined
  const disabledMatchers: DayPickerMatcher[] = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  const dayPickerClassNames = {
    root: 'font-body-md',
    months: 'flex flex-col',
    // `around` layout renders [PreviousButton, MonthCaption, NextButton, MonthGrid] as
    // flat siblings of `month` — a 3-column grid puts the first three in one header row
    // and `month_grid`'s own col-span-3 wraps the day grid onto its own row beneath it.
    month: 'grid grid-cols-[auto_1fr_auto] items-center gap-x-1 gap-y-3',
    month_caption: 'flex items-center justify-center py-1',
    caption_label: 'font-body-md text-body-md font-medium text-primary',
    nav: 'flex items-center',
    button_previous:
      'focus-card grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-brand/[0.06] hover:text-brand disabled:cursor-not-allowed disabled:opacity-30',
    button_next:
      'focus-card grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-brand/[0.06] hover:text-brand disabled:cursor-not-allowed disabled:opacity-30',
    chevron: 'h-4 w-4 fill-current',
    // `table-fixed` pins every column to an equal share of the (now fixed-width) grid —
    // without it the table's auto layout could compress columns narrower than the
    // fixed-size day buttons on a cramped container, pushing the digits outside their
    // circle and the circles outside their cell.
    month_grid: 'col-span-3 w-full table-fixed border-collapse',
    weekdays: '',
    weekday: 'pb-2 text-center font-label-caps text-[11px] uppercase tracking-widest text-on-surface-variant',
    week: '',
    day: 'text-center align-middle',
    day_button:
      'focus-card mx-auto grid h-9 w-9 place-items-center rounded-full font-body-md text-body-md tabular-nums text-primary transition-colors duration-200 hover:bg-brand/[0.08]',
    today: '[&>button]:font-semibold [&>button]:text-brand',
    selected: '[&>button]:bg-brand [&>button]:text-on-primary [&>button]:hover:bg-brand',
    outside: '[&>button]:text-outline/50',
    disabled: '[&>button]:cursor-not-allowed [&>button]:text-outline/30 [&>button]:hover:bg-transparent',
    hidden: 'invisible',
    // Month-change animation, driven by DayPicker's `animate`. Its default stylesheet
    // is not loaded here, so the classes it applies mid-transition are defined too;
    // without them `animate` would leave the outgoing month overlaid on the new one.
    weeks_before_enter: 'animate-cal-in-left',
    weeks_before_exit: 'animate-cal-out-left',
    weeks_after_enter: 'animate-cal-in-right',
    weeks_after_exit: 'animate-cal-out-right',
    caption_before_enter: 'animate-cal-fade-in',
    caption_before_exit: 'animate-cal-fade-out',
    caption_after_enter: 'animate-cal-fade-in',
    caption_after_exit: 'animate-cal-fade-out',
  }

  // Larger targets in the sheet: 44px days and arrows, the minimum comfortable size
  // for a thumb, against the dropdown's 36px ones sized for a pointer.
  const sheetClassNames = {
    ...dayPickerClassNames,
    month: 'grid grid-cols-[auto_1fr_auto] items-center gap-x-1 gap-y-4',
    button_previous: dayPickerClassNames.button_previous.replace('h-8 w-8', 'h-11 w-11'),
    button_next: dayPickerClassNames.button_next.replace('h-8 w-8', 'h-11 w-11'),
    day_button: dayPickerClassNames.day_button.replace('h-9 w-9', 'h-11 w-11'),
  }

  const calendar = (classNames: typeof dayPickerClassNames) => (
    <DayPicker
      mode="single"
      autoFocus
      navLayout="around"
      // Off under reduced motion rather than neutralised with CSS: DayPicker clears
      // the outgoing month on `animationend`, which never fires with no animation.
      animate={!reducedMotion}
      selected={selected}
      defaultMonth={selected ?? minDate}
      locale={dayPickerLocales[locale] ?? enUS}
      disabled={disabledMatchers}
      onSelect={(date) => {
        if (!date) return
        onChange(dateToISO(date))
        setOpen(false)
      }}
      classNames={classNames}
    />
  )

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-labelledby={ariaLabelledBy}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'focus-card flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-surface-container-lowest px-3.5 text-start font-body-md text-body-md transition-colors duration-200',
          invalid ? 'border-error' : 'border-hairline focus-within:border-brand',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          value ? 'text-primary' : 'text-outline',
          className,
        )}
      >
        <span className="truncate tabular-nums">
          {value ? formatISODate(value, locale) : (placeholder ?? '')}
        </span>
        {hideIcon ? null : (
          <Icon name="calendar" className="h-4 w-4 shrink-0 text-on-surface-variant" />
        )}
      </button>

      {panel.mounted && panelStyle && mobile
        ? createPortal(
            /*
              Below `md`: a bottom sheet with a backdrop, the same pattern as the
              search form's own mobile popup. Anchored under the field, the dropdown
              ran off the bottom of a short phone screen, and its 36px days were
              small targets for a thumb. `z-[70]` so it opens above that search sheet
              (`z-[60]`) — at the dropdown's `z-50` it opened behind it, invisible.
            */
            <>
              <span
                aria-hidden
                onClick={() => setOpen(false)}
                className={cn(
                  'fixed inset-0 z-[70] bg-primary/45 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none',
                  panel.shown ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              />
              <div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-modal="true"
                className={cn(
                  'fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-surface-container-lowest px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl',
                  // The same slide and easing as the search sheet it opens from.
                  'transition-transform duration-300 ease-out motion-reduce:transition-none',
                  panel.shown ? 'translate-y-0' : 'pointer-events-none translate-y-full',
                )}
              >
                <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-outline-variant" />
                <div className="mx-auto max-w-sm">
                  {calendar(sheetClassNames)}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}

      {panel.mounted && panelStyle && !mobile
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="false"
              style={{ top: panelStyle.top, left: panelStyle.left }}
              // A fixed width independent of the trigger: a narrow trigger (a
              // quarter-width search field, a two-up form column) would otherwise
              // squeeze the 7-column grid below the day buttons' own size, forcing
              // digits out past their circle. Capped against the viewport so it never
              // runs off a small screen either.
              className={cn(
                'fixed z-50 w-[296px] max-w-[calc(100vw-2rem)] rounded-xl border border-hairline bg-surface-container-lowest p-3 shadow-widget',
                // Grows out of the field it belongs to: down from under it, or up when
                // it has been flipped above it.
                'transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none',
                panelStyle.above ? 'origin-bottom' : 'origin-top',
                panel.shown
                  ? 'translate-y-0 scale-100 opacity-100'
                  : cn('pointer-events-none scale-95 opacity-0', panelStyle.above ? 'translate-y-1' : '-translate-y-1'),
              )}
            >
              {calendar(dayPickerClassNames)}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
