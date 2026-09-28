import type { DefaultCellComponentProps } from 'payload'

import { formatDate, formatDateRange, formatMoney, humanize, toneFor } from './admin-format'

/**
 * List-view cells for the Sales collections.
 *
 * Plain components with no hooks and no server-only imports, so they render correctly
 * wherever Payload chooses to render a cell. Styles live in custom.scss under `.it-`.
 */

type Option = { label?: unknown; value: string } | string

const optionLabel = (options: unknown, value: string): string => {
  if (Array.isArray(options)) {
    for (const option of options as Option[]) {
      if (typeof option === 'string') {
        if (option === value) return humanize(option)
      } else if (option.value === value) {
        if (typeof option.label === 'string') return option.label
        // Localised labels arrive as { en: '...' }.
        if (option.label && typeof option.label === 'object') {
          const first = Object.values(option.label as Record<string, unknown>)[0]
          if (typeof first === 'string') return first
        }
      }
    }
  }
  return humanize(value)
}

export const StatusPill = ({ value, label }: { value: string; label?: string }) => (
  <span className={`it-pill it-pill--${toneFor(value)}`}>
    <span aria-hidden className="it-pill__dot" />
    {label ?? humanize(value)}
  </span>
)

/** A select field rendered as a coloured pill — status, payment status. */
export const StatusCell = ({ cellData, field }: DefaultCellComponentProps) => {
  if (typeof cellData !== 'string' || !cellData) return <span className="it-cell-empty">—</span>
  const options = 'options' in field ? field.options : undefined
  return <StatusPill value={cellData} label={optionLabel(options, cellData)} />
}

/** A select field shown as a quiet tag rather than a status — service type, interest. */
export const TagCell = ({ cellData, field }: DefaultCellComponentProps) => {
  if (typeof cellData !== 'string' || !cellData) return <span className="it-cell-empty">—</span>
  const options = 'options' in field ? field.options : undefined
  return <span className="it-tag">{optionLabel(options, cellData)}</span>
}

type Customer = { firstName?: string; lastName?: string; email?: string; phone?: string }

/**
 * The `customer` group used to render as nothing useful. Name on top, the fastest way
 * to reach them underneath.
 */
export const CustomerCell = ({ cellData }: DefaultCellComponentProps) => {
  const customer = (cellData ?? {}) as Customer
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ')
  const contact = customer.email || customer.phone
  if (!name && !contact) return <span className="it-cell-empty">—</span>
  return (
    <span className="it-stack">
      <span className="it-stack__primary">{name || contact}</span>
      {name && contact ? <span className="it-stack__secondary">{contact}</span> : null}
    </span>
  )
}

export const DateRangeCell = ({ cellData }: DefaultCellComponentProps) => {
  const dates = (cellData ?? {}) as { startDate?: string; endDate?: string }
  const text = formatDateRange(dates.startDate, dates.endDate)
  return <span className={text === '—' ? 'it-cell-empty' : 'it-nowrap'}>{text}</span>
}

export const DateCell = ({ cellData }: DefaultCellComponentProps) => {
  const text = formatDate(cellData)
  return <span className={text === '—' ? 'it-cell-empty' : 'it-nowrap'}>{text}</span>
}

/** The `pricing` group: the total, in the booking's own currency. */
export const PricingCell = ({ cellData }: DefaultCellComponentProps) => {
  const pricing = (cellData ?? {}) as { total?: number; currency?: string }
  const text = formatMoney(pricing.total, pricing.currency)
  return <span className={text === '—' ? 'it-cell-empty' : 'it-money'}>{text}</span>
}

/** A plain number field holding an amount (quote requests' quoted price). */
export const MoneyCell = ({ cellData, rowData }: DefaultCellComponentProps) => {
  const text = formatMoney(cellData, (rowData as { currency?: string } | undefined)?.currency)
  return <span className={text === '—' ? 'it-cell-empty' : 'it-money'}>{text}</span>
}
