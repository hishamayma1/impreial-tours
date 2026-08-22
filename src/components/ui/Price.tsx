'use client'

import { useLocale } from 'next-intl'

import { usePreferencesStore, formatPrice } from '@/stores'
import type { CurrencyVM } from '@/types/content'

type PriceProps = {
  /** Amount in the base currency (USD), as authored in the CMS. */
  amount: number
  currencies: CurrencyVM[]
  className?: string
}

/**
 * Renders a CMS price in the visitor's chosen currency.
 *
 * Selecting with a narrow selector (not destructuring the store) keeps this from
 * re-rendering on unrelated preference changes — Section 6's performance rule.
 * Before hydration the store still reports its default, so the first paint matches
 * the server HTML and no mismatch warning fires.
 */
export const Price = ({ amount, currencies, className }: PriceProps) => {
  const locale = useLocale()
  const code = usePreferencesStore((state) => state.currency)
  const currency = currencies.find((c) => c.code === code) ?? currencies[0]

  return <span className={className}>{formatPrice(amount, currency, locale)}</span>
}
