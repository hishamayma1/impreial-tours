import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { DetailHero } from '@/components/services/DetailHero'
import { DetailSection, FactRow } from '@/components/services/DetailSection'
import { RichText } from '@/components/ui/RichText'
import { ButtonLink } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { locales, type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'
import { getHotelBySlug, getAllSlugs, getAlternateSlugs } from '@/lib/payload/services'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbNode, hotelNode } from '@/lib/structured-data'

const PATH = '/hotels'
type PageParams = { locale: string; slug: string }

export const generateStaticParams = async () => {
  const params: PageParams[] = []
  for (const locale of locales) {
    const slugs = await getAllSlugs('hotels', locale)
    params.push(...slugs.map((slug) => ({ locale, slug })))
  }
  return params
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> => {
  const { locale, slug } = await params
  const hotel = await getHotelBySlug(locale as Locale, slug)
  if (!hotel) return {}

  const alternates = await getAlternateSlugs('hotels', locale as Locale, slug)

  return {
    title: hotel.name,
    description: hotel.address,
    alternates: buildAlternates(locale as Locale, PATH, alternates),
    openGraph: { images: hotel.heroImage ? [hotel.heroImage.url] : [] },
  }
}

const HotelDetailPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const [hotel, settings, t, hotelsT] = await Promise.all([
    getHotelBySlug(locale as Locale, slug),
    getSiteSettings(locale as Locale),
    getTranslations('services'),
    getTranslations('hotels'),
  ])

  if (!hotel) notFound()

  return (
    <>
      <JsonLd
        data={[
          hotelNode(hotel, locale as Locale),
          breadcrumbNode(locale as Locale, [
            { name: hotelsT('title'), path: PATH },
            { name: hotel.name, path: `${PATH}/${hotel.slug}` },
          ]),
        ]}
      />
      <DetailHero
        eyebrow={hotelsT('title')}
        title={hotel.name}
        summary={hotel.address}
        image={hotel.heroImage}
      />

      <DetailSection>
        <FactRow
          facts={[
            {
              label: t('amenitiesTitle'),
              value: hotel.starRating ? '★'.repeat(hotel.starRating) : '',
            },
            { label: t('checkIn'), value: hotel.checkInTime },
            { label: t('checkOut'), value: hotel.checkOutTime },
          ]}
        />
      </DetailSection>

      {hotel.description ? (
        <DetailSection>
          <RichText data={hotel.description} className="max-w-3xl" />
        </DetailSection>
      ) : null}

      {hotel.amenities.length ? (
        <DetailSection title={t('amenitiesTitle')}>
          <ul className="flex flex-wrap gap-3">
            {hotel.amenities.map((amenity) => (
              <li
                key={amenity}
                className="rounded-full border border-hairline px-4 py-2 font-body-md text-caption text-on-surface-variant"
              >
                {/* Amenities are stored as stable keys and translated here, so adding a
                    language never means re-tagging every hotel. */}
                {t(`amenities.${amenity}`)}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {hotel.roomTypes.length ? (
        <DetailSection title={t('rooms')}>
          <div className="space-y-6">
            {hotel.roomTypes.map((room) => (
              <article
                key={room.id}
                className="rounded-xl border border-hairline bg-surface-container-lowest p-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-headline-card text-headline-card text-primary">
                    {room.roomName}
                  </h3>
                  <span className="font-body-md text-caption text-on-surface-variant">
                    {room.bedConfiguration}
                  </span>
                </div>

                {room.roomDescription ? (
                  <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                    {room.roomDescription}
                  </p>
                ) : null}

                {/* Prices are per person per night — the label says so explicitly so a
                    double rate is never mistaken for the whole room. */}
                <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-hairline pt-4">
                  {(
                    [
                      ['single', room.pricing.singlePrice],
                      ['double', room.pricing.doublePrice],
                      ['triple', room.pricing.triplePrice],
                    ] as const
                  ).map(([key, value]) =>
                    value ? (
                      <div key={key}>
                        <dt className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                          {t(key)}
                        </dt>
                        <dd className="mt-1 font-headline-card text-headline-card text-primary">
                          <Price amount={value} currencies={settings.currencies} />
                        </dd>
                      </div>
                    ) : null,
                  )}
                </dl>
                <p className="mt-2 font-body-md text-caption text-on-surface-variant">
                  {t('perPerson')}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10">
            <ButtonLink href={`/booking/hotel?item=${hotel.slug}`} variant="navy" size="lg">
              {t('bookNow')}
            </ButtonLink>
          </div>
        </DetailSection>
      ) : null}

      {hotel.policies ? (
        <DetailSection title={t('policies')}>
          <RichText data={hotel.policies} className="max-w-3xl" />
        </DetailSection>
      ) : null}
    </>
  )
}

export default HotelDetailPage
