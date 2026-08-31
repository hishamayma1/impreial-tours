'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import { Icon } from '@/components/ui/Icon'
import { usePreferencesStore, useUIStore } from '@/stores'
import type { CurrencyVM } from '@/types/content'
import { cn } from '@/lib/utils'

type CurrencySwitcherProps = {
  currencies: CurrencyVM[]
  className?: string
}

export const CurrencySwitcher = ({ currencies, className }: CurrencySwitcherProps) => {
  const t = useTranslations('currency')
  const open = useUIStore((state) => state.currencyMenuOpen)
  const setOpen = useUIStore((state) => state.setCurrencyMenu)
  const currency = usePreferencesStore((state) => state.currency)
  const hydrated = usePreferencesStore((state) => state.hydrated)
  const setCurrency = usePreferencesStore((state) => state.setCurrency)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, setOpen])

  /**
   * Heals a persisted choice that is no longer on offer.
   *
   * The selection lives in localStorage, so someone who picked EUR or GBP before the
   * switcher was reduced to USD and EGP still has that code in their browser. Nothing
   * else breaks — every price falls back to the base currency — but the button would
   * read "EUR" over prices printed in dollars, which is worse than either being
   * wrong on its own. Rewriting the stored value settles it for good rather than
   * papering over it on each render.
   */
  useEffect(() => {
    if (!hydrated || currencies.length === 0) return
    if (!currencies.some((option) => option.code === currency)) setCurrency(currencies[0].code)
  }, [hydrated, currencies, currency, setCurrency])

  if (currencies.length === 0) return null

  /**
   * Before hydration the persisted choice is unknown, so the base currency is shown
   * and the server and client markup agree. The `some` check covers the frame between
   * hydration and the effect above, when the stale code is still in the store.
   */
  const known = currencies.some((option) => option.code === currency)
  const label = hydrated && known ? currency : (currencies[0]?.code ?? 'USD')

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('select')}
        className="flex items-center gap-1.5 rounded-lg px-1 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <Icon name="wallet" className="h-5 w-5" />
        <span className="text-sm font-medium">{label}</span>
        <Icon name="chevron-down" className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={t('label')}
          className="absolute right-0 top-full z-50 mt-3 min-w-[9rem] overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest py-1 shadow-nav"
        >
          {currencies.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                role="option"
                aria-selected={option.code === label}
                onClick={() => {
                  setCurrency(option.code)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-surface-container',
                  option.code === label ? 'text-brand font-medium' : 'text-on-surface-variant',
                )}
              >
                <span>{option.code}</span>
                <span aria-hidden className="text-outline">
                  {option.symbol}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
