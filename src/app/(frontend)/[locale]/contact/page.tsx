import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PlanJourneyForm } from '@/components/sections/PlanJourneyForm'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { locales, type Locale } from '@/i18n/routing'
import { getMediaByFilenames } from '@/lib/payload/media'
import { getSiteSettings } from '@/lib/payload/queries'
import { buildAlternates } from '@/lib/seo'
import { buildWhatsappUrl } from '@/lib/whatsapp'

const PATH = '/contact'

/**
 * Luxor Temple — one of the few seeded uploads that actually depicts Egypt. Several
 * others are generic stock filed under Egyptian names ('destCairo' is Tuscany), so
 * pictures here are chosen by what they show, not by what they are called.
 */
const HERO_IMAGE = 'offerLuxor-1.webp'

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.contact' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale as Locale, PATH),
    // Indexable now that the page carries real content and real contact details.
  }
}

/** A contact detail, as a glass card. `href` is optional — an address is not a link. */
const Detail = ({
  icon,
  label,
  value,
  href,
  action,
}: {
  icon: IconName
  label: string
  value: string
  href?: string
  action?: string
}) => (
  <div className="glass-panel flex flex-col rounded-2xl p-6 card-lift hover:border-brand/30 hover:shadow-widget">
    <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand/[0.07] text-brand">
      <Icon name={icon} className="h-5 w-5" />
    </span>
    <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
      {label}
    </span>
    {/*
      `whitespace-pre-line` so a multi-line address from the CMS keeps the line breaks
      the editor typed instead of collapsing into one run-on line.
    */}
    <span className="mt-1.5 whitespace-pre-line font-body-md text-body-md text-primary">
      {value}
    </span>
    {href ? (
      <a
        href={href}
        className="focus-card mt-3 inline-flex w-fit items-center gap-1.5 rounded-sm font-body-md text-caption text-brand underline decoration-hairline underline-offset-4 transition-colors duration-200 hover:decoration-brand"
      >
        {action ?? value}
        <Icon name="arrow-right" className="h-3.5 w-3.5 rtl:rotate-180" />
      </a>
    ) : null}
  </div>
)

const ContactPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, settings, media] = await Promise.all([
    getTranslations('pages.contact'),
    getSiteSettings(locale as Locale),
    getMediaByFilenames([HERO_IMAGE], 'wide'),
  ])

  const { contact, socialLinks } = settings
  const whatsappUrl = buildWhatsappUrl(contact.whatsappNumber || settings.whatsappNumber, '')

  /**
   * Only the details that are actually filled in.
   *
   * An unconfigured field would otherwise render a labelled card with nothing under
   * it, which reads as a broken page rather than as a detail the company has chosen
   * not to publish.
   */
  const details = [
    contact.email
      ? {
          icon: 'mail' as const,
          label: t('emailLabel'),
          value: contact.email,
          href: `mailto:${contact.email}`,
        }
      : null,
    contact.phone
      ? {
          icon: 'phone' as const,
          label: t('phoneLabel'),
          value: contact.phone,
          // Stripped to digits so the tel: link dials correctly from a phone.
          href: `tel:${contact.phone.replace(/[^\d+]/g, '')}`,
        }
      : null,
    whatsappUrl
      ? {
          icon: 'whatsapp' as const,
          label: t('whatsappLabel'),
          value: contact.whatsappNumber || settings.whatsappNumber,
          href: whatsappUrl,
          action: t('whatsappAction'),
        }
      : null,
    contact.address
      ? { icon: 'pin' as const, label: t('addressLabel'), value: contact.address }
      : null,
    contact.businessHours
      ? { icon: 'clock' as const, label: t('hoursLabel'), value: contact.businessHours }
      : null,
  ].filter((detail): detail is NonNullable<typeof detail> => Boolean(detail))

  return (
    <div className="aurora">
      {/* --- hero -------------------------------------------------------------- */}
      {/*
        -mt-20 for the same reason as the home hero: the sticky header reserves its
        height in flow, which otherwise sits as a band of page background above a
        full-bleed image meant to start at the top of the viewport. See Hero.tsx.
      */}
      <header className="relative isolate -mt-20 overflow-hidden">
        <div data-hero-zone className="absolute inset-0 -z-10">
          <CmsImage
            image={media[HERO_IMAGE]}
            alt=""
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(10_23_40/0.8),rgb(10_23_40/0.45)_45%,rgb(10_23_40/0.88))]"
          />
        </div>

        <Container className="pb-16 pt-32 md:pb-20 md:pt-40">
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

      {/* --- details ----------------------------------------------------------- */}
      {details.length ? (
        <section className="py-14 md:py-20">
          <Container>
            <ul className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {details.map((detail, index) => (
                <li key={detail.label} style={{ '--i': index } as React.CSSProperties}>
                  <Detail {...detail} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* --- form -------------------------------------------------------------- */}
      <section className="border-t border-hairline py-14 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14">
            <div>
              <h2 className="font-headline-section text-headline-section text-primary">
                {t('formTitle')}
              </h2>
              <p className="mt-3 max-w-[58ch] font-body-md text-body-md text-on-surface-variant">
                {t('formBody')}
              </p>
              {/*
                The home page's enquiry form, reused rather than rebuilt. It validates
                against the same Zod schema the route handler parses and lands in the
                same `quote-requests` collection — so there is one inbox to work and no
                second form to keep in step with the first.
              */}
              <div className="mt-8">
                <PlanJourneyForm />
              </div>
            </div>

            <aside className="lg:pt-14">
              {/*
                A written note rather than a photograph.

                This was a picture captioned "our office in Maadi" — but the caption
                described a stock image of Tuscany, and there is no photograph of the
                actual office in the library. A caption that asserts something the
                picture does not show is worse than no picture, so the panel states the
                address and leaves it at that. Swap in a real photo of the office and
                the caption becomes true.
              */}
              {contact.address ? (
                <div className="glass-panel rounded-2xl p-6">
                  <h2 className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    {t('addressLabel')}
                  </h2>
                  <p className="mt-3 whitespace-pre-line font-body-lg text-body-lg text-primary">
                    {contact.address}
                  </p>
                  <p className="mt-4 border-t border-hairline pt-4 font-body-md text-caption text-on-surface-variant">
                    {t('mapCaption')}
                  </p>
                </div>
              ) : null}

              {socialLinks.length ? (
                <div className="mt-8">
                  <h2 className="mb-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    {t('followTitle')}
                  </h2>
                  <ul className="flex flex-wrap gap-2">
                    {socialLinks.map((link) => (
                      <li key={link.platform}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="focus-card inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-surface-container-lowest/70 px-4 font-body-md text-caption capitalize text-on-surface-variant transition-colors duration-200 hover:border-brand/50 hover:text-brand"
                        >
                          {link.platform}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        </Container>
      </section>
    </div>
  )
}

export default ContactPage
