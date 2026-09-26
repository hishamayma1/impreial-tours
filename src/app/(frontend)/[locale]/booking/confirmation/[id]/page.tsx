import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmationSummary } from '@/components/booking/ConfirmationSummary'
import { Container } from '@/components/ui/Container'
import { type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import { getSiteSettings } from '@/lib/payload/queries'

const PATH = '/booking/confirmation'
type PageParams = { locale: string; id: string }

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> => {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'booking.confirmation' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, `${PATH}/${id}`),
    // A confirmation is personal and single-use; keep it out of the index.
    robots: { index: false, follow: false },
  }
}

/**
 * Deliberately does NOT look the booking up. A reference in the URL is not proof of
 * ownership, so rendering the customer's details from the database here would expose
 * them to anyone who guessed a reference. The receipt is rendered client-side from
 * what the booking tab itself saved on submit (see ConfirmationSummary); anyone else
 * opening the link sees only the reference they already have.
 */
const BookingConfirmationPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, id } = await params
  setRequestLocale(locale)

  const [t, settings] = await Promise.all([
    getTranslations('booking.confirmation'),
    getSiteSettings(locale as Locale),
  ])

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <Container size="narrow" className="py-12 md:py-16">
        <ConfirmationSummary reference={decodeURIComponent(id)} currencies={settings.currencies} />
      </Container>
    </>
  )
}

export default BookingConfirmationPage
