import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { Container } from '@/components/ui/Container'
import { ButtonLink } from '@/components/ui/Button'
import { type Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'

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
 * ownership, so rendering the customer's details here would expose them to anyone who
 * guessed a reference. The full record goes to the customer by email instead.
 */
const BookingConfirmationPage = async ({ params }: { params: Promise<PageParams> }) => {
  const { locale, id } = await params
  setRequestLocale(locale)

  const [t, services] = await Promise.all([
    getTranslations('booking.confirmation'),
    getTranslations('services'),
  ])

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <Container size="narrow" className="py-14 md:py-20">
        <div className="rounded-xl border border-hairline bg-surface-container-lowest p-10 text-center">
          <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            {t('reference')}
          </p>
          <p className="mt-3 font-headline-section text-headline-section text-primary">{id}</p>
          <p className="mt-6 font-body-md text-body-md text-on-surface-variant">
            {t('emailNote')}
          </p>
          <ButtonLink href="/" variant="navy" size="lg" className="mt-8">
            {services('bookNow') && t('backHome')}
          </ButtonLink>
        </div>
      </Container>
    </>
  )
}

export default BookingConfirmationPage
