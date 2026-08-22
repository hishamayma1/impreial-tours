import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder'
import { type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'

const PATH = '/tours/experiences'

type PageParams = { locale: string; slug: string }

/**
 * Phase 1 leaves this route dynamic. Phase 3 adds `generateStaticParams` over every
 * locale x slug and swaps the humanised slug below for the real document title.
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
  const { locale, slug } = await params

  return {
    title: humanise(slug),
    // TODO(phase 3): hreflang must point at each locale's own slug via
    // getAlternateSlugs(doc) so switching language keeps the SAME document.
    alternates: buildAlternates(locale as Locale, `${PATH}/${slug}`),
  }
}

const ExperienceDetailPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const t = await getTranslations('tours.experiences')
  const common = await getTranslations('common')

  return (
    <>
      <PageHeader eyebrow={t('title')} title={humanise(slug)} />
      <PhasePlaceholder note={common('comingSoon')} />
    </>
  )
}

export default ExperienceDetailPage
