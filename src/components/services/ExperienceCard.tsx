import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Price } from '@/components/ui/Price'
import type { ServiceCardVM } from '@/types/services'
import type { CurrencyVM } from '@/types/content'

import { FactIcon } from './FactIcon'

type ExperienceCardProps = {
  item: ServiceCardVM
  basePath: string
  currencies: CurrencyVM[]
  index: number
}

/**
 * The multi-day experience card.
 *
 * A different product from a daily tour, so it gets a different shape rather than the
 * same square in a wider grid. These are considered, expensive purchases, so the card
 * is a horizontal editorial row on desktop — a tall 4:5 image beside a column with
 * room for the summary and a proper stat block — and stacks on mobile.
 *
 * The stat block is a real <dl>: days, nights, difficulty and group size are labelled
 * data, not decoration, and reading them as pairs is what a screen reader should get.
 * All four columns share one grid, so the numbers line up across every card on the
 * page — the alignment is structural rather than eyeballed per card.
 */
export const ExperienceCard = async ({
  item,
  basePath,
  currencies,
  index,
}: ExperienceCardProps) => {
  const t = await getTranslations('services')
  const facts = item.facts ?? []

  const stat = (label: string) => facts.find((fact) => fact.label === label)
  const stats = [stat('days'), stat('nights'), stat('difficulty'), stat('groupSize')].filter(
    (fact): fact is NonNullable<typeof fact> => Boolean(fact),
  )

  const statValue = (label: string, value: string) =>
    label === 'difficulty' ? t(`difficulty.${value}`) : value

  return (
    <article
      className="reveal group relative overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest card-lift hover:border-brand/30 hover:shadow-widget focus-within:border-brand/40"
      style={{ '--reveal-index': index } as React.CSSProperties}
    >
      <div className="grid md:grid-cols-12">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-container md:col-span-5 md:aspect-auto md:min-h-[22rem]">
          <CmsImage
            image={item.image}
            alt={item.title}
            sizes="(min-width: 1024px) 42vw, 100vw"
            priority={index === 0}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          {item.badge ? (
            <span className="absolute left-5 top-5 rounded-full bg-brand px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-on-primary shadow-sm">
              {t(`badge.${item.badge}`)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col p-6 md:col-span-7 md:p-9">
          <h3 className="font-headline-section text-headline-card leading-tight text-primary transition-colors duration-200 group-hover:text-brand md:text-headline-section">
            <Link
              href={`${basePath}/${item.slug}`}
              className="focus-card rounded-sm after:absolute after:inset-0 after:content-['']"
            >
              {item.title}
            </Link>
          </h3>

          {item.summary ? (
            <p className="mt-4 line-clamp-3 max-w-xl font-body-lg text-body-md text-on-surface-variant md:text-body-lg">
              {item.summary}
            </p>
          ) : null}

          {stats.length ? (
            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hairline pt-6 sm:grid-cols-4">
              {stats.map((fact) => (
                <div key={fact.label}>
                  <dt className="mb-1.5 flex items-center gap-1.5 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    <FactIcon icon={fact.icon} className="h-3.5 w-3.5 text-brand/70" />
                    {t(`fact.${fact.label}Label`)}
                  </dt>
                  <dd className="font-headline-card text-body-lg text-primary">
                    {statValue(fact.label, fact.value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-7">
            <div>
              {item.priceFrom !== null ? (
                <>
                  <span className="block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    {t('from')}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <Price
                      amount={item.priceFrom}
                      currencies={currencies}
                      className="font-headline-section text-headline-card text-primary"
                    />
                    <span className="font-body-md text-caption text-on-surface-variant">
                      {t('perPersonShort')}
                    </span>
                  </span>
                </>
              ) : (
                <span className="font-body-lg text-body-lg text-primary">
                  {t('priceOnRequest')}
                </span>
              )}
            </div>

            <span
              aria-hidden
              className="inline-flex items-center gap-2 font-body-md text-body-md font-medium text-brand"
            >
              {t('viewItinerary')}
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
