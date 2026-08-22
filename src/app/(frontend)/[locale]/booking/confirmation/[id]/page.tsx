import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder'
import { type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'

const PATH = '/booking/confirmation'

type PageParams = { locale: string; id: string }

/**
 * Phase 1 leaves this route dynamic. Phase 3 adds `generateStaticParams` over every
 * locale x slug and swaps the humanised id below for the real document title.
 */
const humanise = (value: string) =>
  decodeURIComponent(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> => {
  const { locale, id } = await params

  return {
    title: humanise(id),
    // TODO(phase 3): hreflang must point at each locale's own slug via
    // getAlternateSlugs(doc) so switching language keeps the SAME document.
    alternates: buildAlternates(locale as Locale, `${PATH}/${id}`),
  }
}

const BookingConfirmationPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, id } = await params
  setRequestLocale(locale)

  const t = await getTranslations('booking.confirmation')
  const common = await getTranslations('common')

  return (
    <>
      <PageHeader eyebrow={t('title')} title={humanise(id)} />
      <PhasePlaceholder note={common('comingSoon')} />
    </>
  )
}

export default BookingConfirmationPage
