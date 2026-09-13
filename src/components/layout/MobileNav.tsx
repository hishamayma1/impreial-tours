'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { LocaleSwitcher } from './LocaleSwitcher'
import { useUIStore } from '@/stores'
import type { NavItemVM } from '@/types/content'

type MobileNavProps = {
  items: NavItemVM[]
  cta: NavItemVM | null
}

const rowClass =
  'flex flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left font-body-md text-body-md text-on-surface ' +
  'transition-colors hover:bg-surface-container hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rtl:text-right'

const childRowClass =
  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-body-md text-caption text-on-surface-variant ' +
  'transition-colors hover:bg-surface-container hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

/**
 * The mobile nav as an edge-anchored sheet rather than a dropdown under the bar.
 *
 * Portalled to `document.body`, not rendered in place: the header carries
 * `backdrop-filter` once solid, which makes it a containing block for fixed
 * descendants, so a `fixed inset-y-0` sheet positioned inside it would resolve its
 * bottom edge against the 64px bar instead of the viewport and never reach full
 * height. `PrimaryNav`'s desktop scrim hits the same wall for the same reason.
 *
 * Anchored with the `end` logical inset rather than `right`, so it opens from the
 * trailing edge in both writing directions — the `rtl:` translate variant on the
 * closed transform is what makes the slide match that edge under `dir="rtl"`.
 */
export const MobileNav = ({ items, cta }: MobileNavProps) => {
  const t = useTranslations('nav')
  const open = useUIStore((state) => state.mobileNavOpen)
  const toggle = useUIStore((state) => state.toggleMobileNav)
  const close = useUIStore((state) => state.closeMobileNav)
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  // Lock scroll while the sheet is open and close it on Escape.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  // A fresh open always starts with every group collapsed.
  useEffect(() => {
    if (!open) setExpanded(null)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? t('closeMenu') : t('openMenu')}
        className="rounded-lg p-1.5 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current lg:hidden"
      >
        <Icon name={open ? 'close' : 'menu'} />
      </button>

      {mounted
        ? createPortal(
            <>
              <span
                aria-hidden
                onClick={close}
                className={cn(
                  'fixed inset-0 z-[60] bg-primary/45 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden',
                  open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              />

              <div
                id="mobile-nav"
                role="dialog"
                aria-modal="true"
                aria-label={t('openMenu')}
                inert={!open}
                className={cn(
                  'fixed inset-y-0 end-0 z-[60] flex w-[86%] max-w-sm flex-col bg-surface-container-lowest shadow-2xl',
                  'transition-transform duration-300 ease-out lg:hidden',
                  open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full',
                )}
              >
                <div className="flex items-center justify-end border-b border-outline-variant/40 px-5 py-4">
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t('closeMenu')}
                    className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Icon name="close" />
                  </button>
                </div>

                <nav aria-label="Primary" className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                  {items.map((item) => {
                    const key = `${item.href}-${item.label}`

                    if (!item.children?.length) {
                      return (
                        <Link key={key} href={item.href} onClick={close} className={rowClass}>
                          {item.label}
                        </Link>
                      )
                    }

                    const isExpanded = expanded === item.href
                    const hubListed = item.children.some((child) => child.href === item.href)

                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : item.href)}
                          aria-expanded={isExpanded}
                          className="flex w-full items-center"
                        >
                          <span className={rowClass}>{item.label}</span>
                          <Icon
                            name="chevron-down"
                            className={cn(
                              'me-3 h-4 w-4 shrink-0 text-outline transition-transform duration-200',
                              isExpanded && 'rotate-180',
                            )}
                          />
                        </button>

                        <div
                          className={cn(
                            'grid transition-all duration-300 ease-out',
                            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="ms-3 mb-1 flex flex-col gap-0.5 border-s border-outline-variant/40 ps-3">
                              {item.children.map((child) => (
                                <Link
                                  key={`${child.href}-${child.label}`}
                                  href={child.href}
                                  onClick={close}
                                  className={childRowClass}
                                >
                                  {child.label}
                                </Link>
                              ))}
                              {!hubListed ? (
                                <Link
                                  href={item.href}
                                  onClick={close}
                                  className={cn(childRowClass, 'font-medium text-brand')}
                                >
                                  {t('viewAll')}
                                  <Icon name="arrow-right" className="h-3.5 w-3.5 rtl:rotate-180" />
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </nav>

                <div className="flex items-center justify-between gap-4 border-t border-outline-variant/40 px-5 py-4">
                  <LocaleSwitcher />
                  <ButtonLink href={cta?.href ?? '/tours/daily'} onClick={close} variant="navy" size="sm">
                    {cta?.label || t('bookNow')}
                  </ButtonLink>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
