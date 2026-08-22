import { getTranslations } from 'next-intl/server'

import { Container } from '@/components/ui/Container'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { PaginatedVM, ServiceCardVM } from '@/types/services'
import type { CurrencyVM } from '@/types/content'

import { ServiceCard } from './ServiceCard'

type ServiceGridProps = {
  data: PaginatedVM<ServiceCardVM>
  basePath: string
  currencies: CurrencyVM[]
  /** Locale-less path used to build page links, defaults to basePath. */
  paginationPath?: string
}

/**
 * Pagination is rendered as real links carrying `?page=`, so listings stay
 * server-rendered, shareable and crawlable — no client router required.
 */
export const ServiceGrid = async ({
  data,
  basePath,
  currencies,
  paginationPath,
}: ServiceGridProps) => {
  const t = await getTranslations('services')
  const pagePath = paginationPath ?? basePath

  if (!data.items.length) {
    return (
      <Container className="py-20">
        <div className="rounded-xl border border-dashed border-hairline bg-surface-container-lowest p-10 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">{t('empty')}</p>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-16 md:py-20">
      <div className="grid grid-cols-1 gap-grid-gutter sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item) => (
          <ServiceCard key={item.id} item={item} basePath={basePath} currencies={currencies} />
        ))}
      </div>

      {data.totalPages > 1 ? (
        <nav aria-label={t('pagination')} className="mt-14 flex justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
            <Link
              key={page}
              href={page === 1 ? pagePath : `${pagePath}?page=${page}`}
              aria-current={page === data.page ? 'page' : undefined}
              className={cn(
                'flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 font-body-md text-body-md transition-colors',
                page === data.page
                  ? 'border-brand bg-brand text-on-primary'
                  : 'border-hairline text-on-surface-variant hover:border-brand hover:text-brand',
              )}
            >
              {page}
            </Link>
          ))}
        </nav>
      ) : null}
    </Container>
  )
}
