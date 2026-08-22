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

  if (currencies.length === 0) return null

  // Before hydration the persisted choice is unknown; show the base currency so the
  // server and client markup agree.
  const label = hydrated ? currency : (currencies[0]?.code ?? 'USD')

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('select')}
        className="flex items-center gap-1.5 text-on-surface-variant transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg px-1"
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
