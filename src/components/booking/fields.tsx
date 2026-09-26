'use client'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

/**
 * The checkout's form primitives, shared by every service's details step so a hotel
 * stay and a bike rental read as one form language rather than five.
 */

export const controlClass =
  'h-12 w-full rounded-xl border border-hairline bg-surface-container-lowest px-4 font-body-md text-body-md text-primary ' +
  'transition-[border-color,box-shadow] duration-200 placeholder:text-outline ' +
  'focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25'

export const labelClass =
  'mb-1.5 block font-label-caps text-label-caps uppercase tracking-[0.12em] text-on-surface-variant'

/** A labelled field with a reserved line for its error, so validating never shifts the layout. */
export const Field = ({
  label,
  htmlFor,
  labelId,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  labelId?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) => (
  <div className={cn('min-w-0', className)} data-field-error={error ? true : undefined}>
    <label htmlFor={htmlFor} id={labelId} className={labelClass}>
      {label}
      {required ? <span aria-hidden className="text-brand"> *</span> : null}
    </label>
    {children}
    <p
      className={cn(
        'mt-1 min-h-[1.15rem] font-body-md text-caption',
        error ? 'text-error' : 'text-on-surface-variant',
      )}
    >
      {error || hint || ' '}
    </p>
  </div>
)

export const Select = ({
  id,
  value,
  onChange,
  invalid,
  children,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  children: React.ReactNode
}) => (
  <div className="relative">
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={invalid || undefined}
      className={cn(controlClass, 'appearance-none pe-10', invalid && 'border-error/60')}
    >
      {children}
    </select>
    <Icon
      name="chevron-down"
      className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
    />
  </div>
)

/**
 * A − / + counter for headcounts and quantities.
 *
 * Replaces the bare `<input type="number">` the wizard used, which accepted a typed
 * "0" adults or "-3" children and relied on the server to object.
 */
export const Stepper = ({
  label,
  hint,
  value,
  min = 0,
  max = 40,
  onChange,
  error,
  decreaseLabel,
  increaseLabel,
}: {
  label: string
  hint?: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  error?: string
  decreaseLabel: string
  increaseLabel: string
}) => (
  <div
    className="flex items-center justify-between gap-4 border-b border-hairline py-4 last:border-b-0"
    data-field-error={error ? true : undefined}
  >
    <div className="min-w-0">
      <span className="block font-body-md text-body-md text-primary">{label}</span>
      {error ? (
        <span className="block font-body-md text-caption text-error">{error}</span>
      ) : hint ? (
        <span className="block font-body-md text-caption text-on-surface-variant">{hint}</span>
      ) : null}
    </div>
    <div className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-hairline p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`${decreaseLabel}: ${label}`}
        className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-brand/[0.06] hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span
        aria-live="polite"
        className="min-w-10 text-center font-body-md text-body-md tabular-nums text-primary"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`${increaseLabel}: ${label}`}
        className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant transition-colors duration-200 hover:bg-brand/[0.06] hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  </div>
)

export const CheckboxCard = ({
  checked,
  onChange,
  label,
  trailing,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  trailing?: string
}) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline p-3.5 transition-colors duration-200 hover:border-brand/40">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="peer sr-only"
    />
    <span
      aria-hidden
      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border border-outline-variant bg-surface-container-lowest transition-colors duration-150 peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
    >
      <Icon name="check" className="h-3 w-3 text-on-primary transition-opacity" />
    </span>
    <span className="min-w-0 flex-1 font-body-md text-body-md text-primary">{label}</span>
    {trailing ? (
      <span className="shrink-0 font-body-md text-caption text-on-surface-variant">{trailing}</span>
    ) : null}
  </label>
)

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 mt-8 font-body-lg text-body-lg text-primary first:mt-0">{children}</h3>
)
