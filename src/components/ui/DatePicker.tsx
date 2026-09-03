'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { DayPicker, type Locale as DayPickerLocale, type Matcher as DayPickerMatcher } from 'react-day-picker'
import { de, enUS, es } from 'react-day-picker/locale'

import { Icon } from '@/components/ui/Icon'
import { dateToISO, formatISODate, isoToDate, todayISO } from '@/lib/date'
import { cn } from '@/lib/utils'

const dayPickerLocales: Record<string, DayPickerLocale> = { en: enUS, es, de }

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
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
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
  }

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

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          // A fixed width independent of the trigger: a narrow trigger (a quarter-width
          // search field, a two-up form column) would otherwise squeeze the 7-column
          // grid below the day buttons' own size, forcing digits out past their circle.
          // Capped against the viewport so it never runs off a small screen either.
          className="absolute z-50 mt-2 w-[296px] max-w-[calc(100vw-2rem)] rounded-xl border border-hairline bg-surface-container-lowest p-3 shadow-widget"
        >
          <DayPicker
            mode="single"
            autoFocus
            navLayout="around"
            selected={selected}
            defaultMonth={selected ?? minDate}
            locale={dayPickerLocales[locale] ?? enUS}
            disabled={disabledMatchers}
            onSelect={(date) => {
              if (!date) return
              onChange(dateToISO(date))
              setOpen(false)
            }}
            classNames={dayPickerClassNames}
          />
        </div>
      ) : null}
    </div>
  )
}
