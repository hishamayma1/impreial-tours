'use client'

import { useEffect } from 'react'
import { DayPicker, type Locale as DayPickerLocale, type Matcher as DayPickerMatcher } from 'react-day-picker'
import { de, enUS, es } from 'react-day-picker/locale'

/**
 * The calendar grid behind `DatePicker`, split into its own chunk.
 *
 * DayPicker plus three date-fns locales is the heaviest thing in any form that has a
 * date field, and the hero search put one on the home page — where most visitors never
 * open it. Only the trigger button renders on first paint; this loads when the panel
 * is first opened (and is warmed on hover/focus/touch, just before that).
 */

const dayPickerLocales: Record<string, DayPickerLocale> = { en: enUS, es, de }

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

export type DatePickerCalendarProps = {
  variant: 'sheet' | 'dropdown'
  locale: string
  selected?: Date
  minDate?: Date
  maxDate?: Date
  reducedMotion: boolean
  onSelect: (date: Date) => void
  /** Called once mounted, so the panel can re-measure against the real grid height. */
  onReady?: () => void
}

const DatePickerCalendar = ({
  variant,
  locale,
  selected,
  minDate,
  maxDate,
  reducedMotion,
  onSelect,
  onReady,
}: DatePickerCalendarProps) => {
  useEffect(() => {
    onReady?.()
    // Once per mount: the loading placeholder has just been swapped for the grid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const disabledMatchers: DayPickerMatcher[] = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  return (
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
        if (date) onSelect(date)
      }}
      classNames={variant === 'sheet' ? sheetClassNames : dayPickerClassNames}
    />
  )
}

export default DatePickerCalendar
