'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Fragment } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { locales, localeLabels, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

type LocaleSwitcherProps = {
  className?: string
  tone?: 'dark' | 'light'
}

/**
 * Renders the EN | ES | DE control as real links so each translation is crawlable
 * and works without JavaScript. `usePathname` from next-intl returns the pathname
 * without the locale prefix, so the current route is preserved on switch.
 */
export const LocaleSwitcher = ({ className, tone = 'dark' }: LocaleSwitcherProps) => {
  const t = useTranslations('locale')
  const active = useLocale() as Locale
  const pathname = usePathname()
  const params = useParams()

  return (
    <nav aria-label={t('label')} className={cn('flex items-center gap-1 text-sm', className)}>
      {locales.map((locale, index) => (
        <Fragment key={locale}>
          {index > 0 ? (
            <span aria-hidden className={tone === 'dark' ? 'text-outline' : 'text-white/40'}>
              |
            </span>
          ) : null}
          <Link
            href={{ pathname, params } as never}
            locale={locale}
            hrefLang={localeLabels[locale].hreflang}
            aria-current={locale === active ? 'true' : undefined}
            className={cn(
              'px-1 font-medium transition-colors',
              tone === 'dark'
                ? locale === active
                  ? 'text-brand'
                  : 'text-on-surface-variant hover:text-brand'
                : locale === active
                  ? 'text-white'
                  : 'text-white/70 hover:text-white',
            )}
          >
            {localeLabels[locale].short}
          </Link>
        </Fragment>
      ))}
    </nav>
  )
}
