import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/Button'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { locales, type Locale } from '@/i18n/routing'
import { getMediaByFilenames } from '@/lib/payload/media'
import { buildAlternates } from '@/lib/seo'

const PATH = '/about'

/**
 * The uploads this page reads, by filename.
 *
 * Resolved through the Media library rather than hard-coded `/media/…` paths, so
 * swapping a picture in the admin changes the page and brings its size variants and
 * alt text along. A filename with no match renders as a neutral surface rather than a
 * broken image.
 *
 * Restricted to the uploads that actually depict Egypt. Much of the seeded library is
 * generic stock filed under Egyptian names — 'destLuxor' is Santorini, 'destCairo' is
 * Tuscany, 'journalDesert' is Kyoto — so picking by filename alone would have put
 * Greece and Japan on a page about running tours in Egypt. Verify a picture before
 * adding it here.
 */
const IMAGES = {
  hero: 'hero-1.webp',
  story: 'serviceMuseum-1.webp',
  team: 'serviceCollage-1.webp',
  strip: ['offerLuxor-1.webp', 'offerSahara-1.webp', 'hero-1.webp'],
}

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.about' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
    // Indexable now that the page carries real content — it was noindexed only while
    // it was a placeholder, and the sitemap lists it again alongside this change.
  }
}

const AboutPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, media] = await Promise.all([
    getTranslations('pages.about'),
    getMediaByFilenames([IMAGES.hero, IMAGES.story, IMAGES.team, ...IMAGES.strip], 'wide'),
  ])

  const stats = [
    { value: '14', label: t('statYears') },
    { value: '9,400', label: t('statGuests') },
    { value: '22', label: t('statGuides') },
    { value: '4.8', label: t('statRating') },
  ]

  const values: Array<{ icon: IconName; title: string; body: string }> = [
    { icon: 'users', title: t('value1Title'), body: t('value1Body') },
    { icon: 'shield', title: t('value2Title'), body: t('value2Body') },
    { icon: 'wallet', title: t('value3Title'), body: t('value3Body') },
    { icon: 'mail', title: t('value4Title'), body: t('value4Body') },
  ]

  return (
    <div className="aurora">
      {/* --- hero -------------------------------------------------------------- */}
      {/*
        -mt-20 for the same reason as the home hero: the sticky header reserves its
        height in flow, which otherwise sits as a band of page background above a
        full-bleed image meant to start at the top of the viewport. See Hero.tsx.
      */}
      <header className="relative isolate -mt-20 overflow-hidden">
        {/*
          `data-hero-zone` tells HeaderShell to render the bar transparent over this
          photograph and turn solid as its foot passes under.
        */}
        <div data-hero-zone className="absolute inset-0 -z-10">
          <CmsImage image={media[IMAGES.hero]} alt="" sizes="100vw" priority className="object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(10_23_40/0.78),rgb(10_23_40/0.4)_40%,rgb(10_23_40/0.85))]"
          />
        </div>

        <Container className="pb-20 pt-32 md:pb-28 md:pt-40">
          <div className="max-w-3xl">
            <span className="glass mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-label-caps text-label-caps uppercase tracking-widest text-white">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/80" />
              {t('eyebrow')}
            </span>
            <h1 className="font-display-hero text-display-hero-mobile leading-[1.08] text-white md:text-[56px]">
              {t('title')}
            </h1>
            <p className="mt-5 max-w-[58ch] font-body-lg text-body-lg text-white/85">{t('lead')}</p>
          </div>
        </Container>

      </header>

      {/*
        The stats overlap the hero's foot, which is what the glass is for — a
        translucent panel over the photograph rather than a band beneath it.

        Rendered *outside* the `<header>` and pulled up with a negative margin, not
        inside it with a positive one: the hero clips its own overflow to keep the
        background image inside its box, and anything deliberately overhanging the
        bottom edge got clipped along with it — the panel lost its figures and kept
        only a sliver of its labels.
      */}
      <Container className="relative z-10 -mt-14 md:-mt-16">
        <dl className="glass stagger grid grid-cols-2 gap-px overflow-hidden rounded-2xl md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              style={{ '--i': index } as React.CSSProperties}
              className="bg-white/5 p-6 text-center backdrop-blur-sm"
            >
              <dt className="font-label-caps text-label-caps uppercase tracking-widest text-white/70">
                {stat.label}
              </dt>
              <dd className="mt-2 font-display-hero text-headline-section text-white">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>

      {/* --- story ------------------------------------------------------------- */}
      <section className="pb-20 pt-24 md:pb-28 md:pt-32">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <CmsImage
                image={media[IMAGES.story]}
                alt=""
                sizes="(min-width: 1024px) 45vw, 92vw"
                className="object-cover"
              />
            </div>

            <div>
              <h2 className="max-w-[20ch] font-headline-section text-headline-section text-primary">
                {t('storyTitle')}
              </h2>
              <p className="mt-5 max-w-[62ch] font-body-lg text-body-lg text-on-surface-variant">
                {t('storyBody')}
              </p>
              <p className="mt-4 max-w-[62ch] font-body-md text-body-md text-on-surface-variant">
                {t('storyBody2')}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* --- values ------------------------------------------------------------ */}
      <section className="border-t border-hairline py-20 md:py-28">
        <Container>
          <h2 className="mb-10 font-headline-section text-headline-section text-primary">
            {t('valuesTitle')}
          </h2>

          <ul className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <li
                key={value.title}
                style={{ '--i': index } as React.CSSProperties}
                className="glass-panel flex flex-col rounded-2xl p-6 card-lift hover:border-brand/30 hover:shadow-widget"
              >
                <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-brand/[0.07] text-brand">
                  <Icon name={value.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-headline-card text-headline-card text-primary">{value.title}</h3>
                <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                  {value.body}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* --- team -------------------------------------------------------------- */}
      <section className="border-t border-hairline py-20 md:py-28">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <CmsImage
                image={media[IMAGES.team]}
                alt=""
                sizes="(min-width: 1024px) 35vw, 92vw"
                className="object-cover"
              />
            </div>

            <div>
              <h2 className="max-w-[20ch] font-headline-section text-headline-section text-primary">
                {t('teamTitle')}
              </h2>
              <p className="mt-5 max-w-[62ch] font-body-lg text-body-lg text-on-surface-variant">
                {t('teamBody')}
              </p>

              {/* A strip of the places the team works, kept small so it reads as
                  supporting evidence rather than as a second gallery. */}
              <ul className="mt-8 grid grid-cols-3 gap-3">
                {IMAGES.strip.map((filename) => (
                  <li key={filename} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                    <CmsImage
                      image={media[filename]}
                      alt=""
                      sizes="(min-width: 1024px) 18vw, 30vw"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* --- cta --------------------------------------------------------------- */}
      <section className="border-t border-hairline py-20 md:py-24">
        <Container>
          <div className="glass-panel mx-auto max-w-3xl rounded-2xl p-10 text-center md:p-14">
            <h2 className="font-headline-section text-headline-section text-primary">
              {t('ctaTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] font-body-lg text-body-lg text-on-surface-variant">
              {t('ctaBody')}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/tours" variant="navy" size="lg">
                {t('ctaPrimary')}
              </ButtonLink>
              <ButtonLink href="/contact" variant="outlineNavy" size="lg">
                {t('ctaSecondary')}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}

export default AboutPage
