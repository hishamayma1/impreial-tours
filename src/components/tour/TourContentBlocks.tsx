import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Price } from '@/components/ui/Price'
import type { ImageVM, CurrencyVM } from '@/types/content'
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
 * The day-by-day itinerary, as a vertical timeline.
 *
 * This is the centrepiece of a multi-day page: the reader is buying a sequence, so
 * the layout should read as one. The connecting rule is drawn on the list itself
 * rather than per item, so it never breaks between days, and it stops at the last
 * marker instead of trailing into whitespace.
 */
export const ItineraryTimeline = async ({
  days,
}: {
  days: TourDetailVM['itinerary']
}) => {
  const t = await getTranslations('services')
  if (!days.length) return null

  return (
    <ol className="relative space-y-10 before:absolute before:bottom-6 before:left-[15px] before:top-3 before:w-px before:bg-hairline before:content-['']">
      {days.map((day) => (
        <li key={day.dayNumber} className="reveal relative pl-12">
          <span
            aria-hidden
            className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-container-lowest font-headline-card text-caption text-brand"
          >
            {day.dayNumber}
          </span>

          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <p className="mb-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
                {t('day')} {day.dayNumber}
              </p>
              <h3 className="mb-3 font-headline-card text-headline-card text-primary">
                {day.dayTitle}
              </h3>
              <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">
                {day.dayDescription}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {day.meals.map((meal) => (
                  <span
                    key={meal}
                    className="rounded-full border border-hairline px-2.5 py-1 font-body-md text-caption text-on-surface-variant"
                  >
                    {t(`meals.${meal}`)}
                  </span>
                ))}
                {day.accommodation ? (
                  <span className="rounded-full bg-surface-container px-2.5 py-1 font-body-md text-caption text-on-surface-variant">
                    {day.accommodation}
                  </span>
                ) : null}
              </div>
            </div>

            {day.image ? (
              <div className="relative h-36 w-full overflow-hidden rounded-xl md:h-28 md:w-44">
                <CmsImage image={day.image} alt={day.dayTitle} sizes="176px" className="object-cover" />
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * Gallery grid. The first image spans two columns on desktop, which gives the set a
 * focal point instead of a uniform contact sheet.
 */
export const GalleryGrid = ({
  images,
  title,
}: {
  images: Array<{ image: ImageVM | null; caption: string }>
  title: string
}) => {
  if (!images.length) return null

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {images.slice(0, 8).map((entry, index) => (
        <li
          key={entry.image?.url ?? index}
          className={index === 0 ? 'col-span-2 row-span-2' : undefined}
        >
          <figure className="relative h-full overflow-hidden rounded-xl bg-surface-container">
            <div className={index === 0 ? 'aspect-square' : 'aspect-[4/3]'}>
              <CmsImage
                image={entry.image}
                alt={entry.caption || title}
                sizes={index === 0 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            {entry.caption ? (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 font-body-md text-caption text-white">
                {entry.caption}
              </figcaption>
            ) : null}
          </figure>
        </li>
      ))}
    </ul>
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
