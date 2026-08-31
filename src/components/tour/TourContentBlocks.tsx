import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Price } from '@/components/ui/Price'
import type { CurrencyVM } from '@/types/content'
import type { TourDetailVM } from '@/types/services'

/** Highlights as numbered cards — a scannable promise of what the day contains. */
export const HighlightList = ({ items }: { items: string[] }) => {
  if (!items.length) return null

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <li
          key={item}
          className="reveal rounded-xl border border-hairline bg-surface-container-lowest p-5"
        >
          <span
            aria-hidden
            className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 font-headline-card text-caption text-brand"
          >
            {index + 1}
          </span>
          <p className="font-body-md text-body-md text-on-surface">{item}</p>
        </li>
      ))}
    </ul>
  )
}

/**
 * Included and excluded side by side.
 *
 * Two columns rather than one stacked list: the comparison is the point, and reading
 * "what I get" against "what I pay extra for" is the question a buyer actually has.
 * Colour is not the only signal — each list has its own heading and glyph, so the
 * distinction survives a colour-blind reader and a greyscale print.
 */
export const InclusionColumns = async ({
  included,
  notIncluded,
}: {
  included: string[]
  notIncluded: string[]
}) => {
  const t = await getTranslations('services')
  if (!included.length && !notIncluded.length) return null

  const column = (items: string[], heading: string, tone: 'in' | 'out') =>
    items.length ? (
      <div>
        <h3 className="mb-4 font-headline-card text-headline-card text-primary">{heading}</h3>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 font-body-md text-body-md text-on-surface-variant">
              <span
                aria-hidden
                className={
                  tone === 'in'
                    ? 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand'
                    : 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container text-outline'
                }
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                  {tone === 'in' ? (
                    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                  )}
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    ) : null

  return (
    <div className="grid gap-10 md:grid-cols-2">
      {column(included, t('included'), 'in')}
      {column(notIncluded, t('notIncluded'), 'out')}
    </div>
  )
}

/**
 * The day-by-day itinerary.
 *
 * This is the centrepiece of a multi-day page: the reader is buying a sequence, so
 * the layout has to read as one. It opens with an at-a-glance list of every day —
 * the whole shape of the trip in one screen, which a timeline alone never gives you
 * because it is taller than the viewport — and then the days in full.
 *
 * The connecting rule is drawn on the list rather than per item, so it never breaks
 * between days, and it stops at the last marker instead of trailing into whitespace.
 */
export const ItineraryTimeline = async ({
  days,
}: {
  days: TourDetailVM['itinerary']
}) => {
  const t = await getTranslations('services')
  if (!days.length) return null

  return (
    <div>
      {/*
        The summary is decorative repetition for a screen reader — every day below is
        the same text — so it is a plain list and the anchor targets stay on the days.
      */}
      {days.length > 2 ? (
        <div className="mb-12 rounded-2xl border border-hairline bg-surface-container-low p-5 md:p-6">
          <p className="mb-4 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            {t('atAGlance')}
          </p>
          <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {days.map((day) => (
              <li key={day.dayNumber} className="flex gap-3">
                <span className="w-12 shrink-0 font-label-caps text-label-caps uppercase tracking-widest text-brand">
                  {t('day')} {day.dayNumber}
                </span>
                <span className="font-body-md text-body-md text-on-surface">{day.dayTitle}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <ol className="relative space-y-8 before:absolute before:bottom-10 before:left-[19px] before:top-10 before:w-px before:bg-hairline before:content-['']">
        {days.map((day) => (
          <li key={day.dayNumber} className="reveal relative pl-14 md:pl-16">
            <span
              aria-hidden
              className="absolute left-0 top-0 flex h-10 w-10 flex-col items-center justify-center rounded-full border border-hairline bg-surface-container-lowest font-headline-card text-body-lg leading-none text-brand shadow-widget"
            >
              {day.dayNumber}
            </span>

            <article className="overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest">
              <div className="grid gap-0 md:grid-cols-[1fr_auto]">
                <div className="p-5 md:p-6">
                  <p className="mb-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
                    {t('day')} {day.dayNumber}
                  </p>
                  <h3 className="font-headline-card text-headline-card text-primary">
                    {day.dayTitle}
                  </h3>
                  {day.dayDescription ? (
                    <p className="mt-3 max-w-2xl font-body-md text-body-md text-on-surface-variant">
                      {day.dayDescription}
                    </p>
                  ) : null}

                  {day.meals.length || day.accommodation ? (
                    <dl className="mt-5 flex flex-wrap items-start gap-x-8 gap-y-4 border-t border-hairline pt-4">
                      {day.meals.length ? (
                        <div>
                          <dt className="mb-1.5 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                            {t('mealsLabel')}
                          </dt>
                          <dd className="flex flex-wrap gap-2">
                            {day.meals.map((meal) => (
                              <span
                                key={meal}
                                className="inline-flex items-center gap-1.5 rounded-full bg-brand/8 px-2.5 py-1 font-body-md text-caption text-brand"
                              >
                                <svg
                                  aria-hidden
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  className="h-3 w-3"
                                >
                                  <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {t(`meals.${meal}`)}
                              </span>
                            ))}
                          </dd>
                        </div>
                      ) : null}

                      {day.accommodation ? (
                        <div>
                          <dt className="mb-1.5 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                            {t('accommodationLabel')}
                          </dt>
                          <dd className="font-body-md text-body-md text-on-surface">
                            {day.accommodation}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>

                {day.image ? (
                  <div className="relative h-44 w-full md:h-full md:w-56">
                    <CmsImage
                      image={day.image}
                      alt={day.dayTitle}
                      sizes="(min-width: 768px) 224px, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Group-size price tiers, shown as a table so the saving with a larger party is legible. */
export const PriceTiers = async ({
  tiers,
  currencies,
}: {
  tiers: TourDetailVM['priceTiers']
  currencies: CurrencyVM[]
}) => {
  const t = await getTranslations('services')
  if (!tiers.length) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{t('priceTiersCaption')}</caption>
        <thead className="bg-surface-container-low">
          <tr>
            <th
              scope="col"
              className="px-5 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
            >
              {t('fact.groupSizeLabel')}
            </th>
            <th
              scope="col"
              className="px-5 py-3 text-right font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
            >
              {t('perPersonShort')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {tiers.map((tier) => (
            <tr key={`${tier.minPax}-${tier.maxPax}`}>
              <td className="px-5 py-3 font-body-md text-body-md text-on-surface">
                {tier.minPax}–{tier.maxPax}
              </td>
              <td className="px-5 py-3 text-right">
                <Price
                  amount={tier.pricePerPerson}
                  currencies={currencies}
                  className="font-headline-card text-body-lg text-primary"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
