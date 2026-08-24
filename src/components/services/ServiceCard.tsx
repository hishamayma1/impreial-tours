import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Price } from '@/components/ui/Price'
import type { ServiceCardVM } from '@/types/services'
import type { CurrencyVM } from '@/types/content'

type ServiceCardProps = {
  item: ServiceCardVM
  /** Locale-less base path; the card appends the slug. */
  basePath: string
  currencies: CurrencyVM[]
}

/**
 * One card for every service. Server-rendered apart from the price, which needs the
 * visitor's currency choice — so only that span ships JavaScript.
 */
export const ServiceCard = async ({ item, basePath, currencies }: ServiceCardProps) => {
  const t = await getTranslations('services')

  return (
    <article className="group overflow-hidden rounded-xl border border-hairline bg-surface-container-lowest transition-shadow duration-300 hover:shadow-nav">
      <Link href={`${basePath}/${item.slug}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container">
          <CmsImage
            image={item.image}
            alt={item.title}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {item.badge ? (
            <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-on-primary">
              {t(`badge.${item.badge}`)}
            </span>
          ) : null}
        </div>

        <div className="p-6">
          {item.meta.length ? (
            <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              {item.meta.join(' · ')}
            </p>
          ) : null}

          <h3 className="font-headline-card text-headline-card text-primary transition-colors group-hover:text-brand">
            {item.title}
          </h3>

          {item.summary ? (
            <p className="mt-3 line-clamp-3 font-body-md text-body-md text-on-surface-variant">
              {item.summary}
            </p>
          ) : null}

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-hairline pt-4">
            {item.priceFrom !== null ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                {t('from')}{' '}
                <Price
                  amount={item.priceFrom}
                  currencies={currencies}
                  className="font-headline-card text-headline-card text-primary"
                />
              </p>
            ) : (
              <span className="font-body-md text-body-md text-on-surface-variant">
                {t('priceOnRequest')}
              </span>
            )}

            {item.rating ? (
              <span className="font-body-md text-body-md text-on-surface-variant">
                ★ {item.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  )
}
