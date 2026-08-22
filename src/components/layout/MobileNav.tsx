'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { LocaleSwitcher } from './LocaleSwitcher'
import { useUIStore } from '@/stores'
import type { NavItemVM } from '@/types/content'

type MobileNavProps = {
  items: NavItemVM[]
  cta: NavItemVM | null
}

const itemClass =
  'rounded-lg px-2 py-3 font-body-md text-body-md tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand'

export const MobileNav = ({ items, cta }: MobileNavProps) => {
  const t = useTranslations('nav')
  const open = useUIStore((state) => state.mobileNavOpen)
  const toggle = useUIStore((state) => state.toggleMobileNav)
  const close = useUIStore((state) => state.closeMobileNav)

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

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? t('closeMenu') : t('openMenu')}
        className="md:hidden rounded-lg p-1.5 text-primary transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Icon name={open ? 'close' : 'menu'} />
      </button>

      <div
        id="mobile-nav"
        hidden={!open}
        className="fixed inset-x-0 top-24 z-40 mx-6 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-widget md:hidden"
      >
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <div key={`${item.href}-${item.label}`}>
              <Link href={item.href} onClick={close} className={itemClass}>
                {item.label}
              </Link>
              {/* Children are laid out flat and indented — a sheet this size does not
                  need accordions, and every destination stays one tap away. */}
              {item.children?.length ? (
                <div className="ml-3 flex flex-col border-l border-outline-variant/40 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={`${child.href}-${child.label}`}
                      href={child.href}
                      onClick={close}
                      className={`${itemClass} text-caption`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-outline-variant/40 pt-6">
          <LocaleSwitcher />
          <ButtonLink href={cta?.href ?? '/tours/daily'} onClick={close} variant="navy" size="sm">
            {cta?.label || t('bookNow')}
          </ButtonLink>
        </div>
      </div>
    </>
  )
}
