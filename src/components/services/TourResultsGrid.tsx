import { getTranslations } from 'next-intl/server'

import { Container } from '@/components/ui/Container'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { PaginatedVM, ServiceCardVM } from '@/types/services'
import type { CurrencyVM } from '@/types/content'

import { TourCard } from './TourCard'
import { ExperienceCard } from './ExperienceCard'

type TourResultsGridProps = {
  data: PaginatedVM<ServiceCardVM>
  basePath: string
  currencies: CurrencyVM[]
  /** 'daily' lays out a 3-column card grid; 'experience' a single editorial column. */
  variant: 'daily' | 'experience'
}

/**
 * Results layout for the two tour listings.
 *
 * Daily tours use a 3-up grid with `items-stretch`, so every card in a row is the
 * same height and their price rows share a baseline. Experiences use one column of
 * wide editorial rows, which suits a longer, costlier product and leaves room for the
 * stat block.
 *
 * The result count is announced politely: filtering swaps the list under a screen
 * reader's feet otherwise, with nothing said about what changed.
 */
export const TourResultsGrid = async ({
  data,
  basePath,
  currencies,
  variant,
}: TourResultsGridProps) => {
  const t = await getTranslations('services')

  if (!data.items.length) {
    return (
      <Container className="py-24">
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-hairline bg-surface-container-lowest p-12 text-center">
          <p className="font-headline-card text-headline-card text-primary">{t('emptyTitle')}</p>
          <p className="mt-3 font-body-md text-body-md text-on-surface-variant">{t('empty')}</p>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-14 md:py-20">
      <p aria-live="polite" className="mb-8 font-body-md text-body-md text-on-surface-variant">
        {t('resultCount', { count: String(data.totalDocs) })}
      </p>

      <div
        className={cn(
          'grid gap-grid-gutter',
          variant === 'daily'
            ? 'grid-cols-1 items-stretch sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 gap-8',
        )}
      >
        {data.items.map((item, index) =>
          variant === 'daily' ? (
            <TourCard
              key={item.id}
              item={item}
              basePath={basePath}
              currencies={currencies}
              index={index}
            />
          ) : (
            <ExperienceCard
              key={item.id}
              item={item}
              basePath={basePath}
              currencies={currencies}
              index={index}
            />
          ),
        )}
      </div>

      {data.totalPages > 1 ? (
        <nav aria-label={t('pagination')} className="mt-16 flex justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
            <Link
              key={page}
              href={page === 1 ? basePath : `${basePath}?page=${page}`}
              aria-current={page === data.page ? 'page' : undefined}
              className={cn(
                'focus-card flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 font-body-md text-body-md transition-colors duration-200',
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
