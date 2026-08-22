import { useTranslations } from 'next-intl'

import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

const NotFound = () => {
  const t = useTranslations('notFound')

  return (
    <Container
      size="narrow"
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
    >
      <p className="mb-4 font-label-caps text-label-caps uppercase tracking-widest text-brand">
        404
      </p>
      <h1 className="mb-4 font-headline-section text-headline-section text-primary">{t('title')}</h1>
      <p className="mb-8 font-body-lg text-body-lg text-on-surface-variant">{t('body')}</p>
      <ButtonLink href="/" variant="navy" size="lg">
        {t('cta')}
      </ButtonLink>
    </Container>
  )
}

export default NotFound
