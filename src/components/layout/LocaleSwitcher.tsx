'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Fragment } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { locales, localeLabels, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

type LocaleSwitcherProps = {
  className?: string
}

/**
 * Renders the EN | ES | DE control as real links so each translation is crawlable
 * and works without JavaScript. `usePathname` from next-intl returns the pathname
 * without the locale prefix, so the current route is preserved on switch.
 *
 * Every colour here is `currentColor` at a different opacity rather than a named
 * token, because the header this sits in is navy over a photograph and grey over
 * white. A `tone` prop cannot express that: the tone changes on scroll, and the
 * header keeps its state in a client shell that this component never sees.
 */
export const LocaleSwitcher = ({ className }: LocaleSwitcherProps) => {
  const t = useTranslations('locale')
  const active = useLocale() as Locale
  const pathname = usePathname()
  const params = useParams()

  return (
    <nav aria-label={t('label')} className={cn('flex items-center gap-1 text-sm', className)}>
      {locales.map((locale, index) => (
        <Fragment key={locale}>
          {index > 0 ? (
            <span aria-hidden className="opacity-40">
              |
            </span>
          ) : null}
          <Link
            href={{ pathname, params } as never}
            locale={locale}
            hrefLang={localeLabels[locale].hreflang}
            aria-current={locale === active ? 'true' : undefined}
            className={cn(
              'rounded px-1 font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current',
              locale === active ? 'opacity-100' : 'opacity-60 hover:opacity-100',
            )}
          >
            {localeLabels[locale].short}
          </Link>
        </Fragment>
      ))}
    </nav>
  )
}
