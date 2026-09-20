import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { locales, type Locale } from '@/i18n/routing'
import { getSiteSettings } from '@/lib/payload/queries'
import { buildAlternates } from '@/lib/seo'

const PATH = '/privacy-policy'

/**
 * Fixed on the day this policy was written rather than derived from `updatedAt` on
 * some CMS document — there isn't one yet. Bump this by hand the next time the text
 * actually changes; it is not meant to move on every deploy.
 */
const LAST_UPDATED = '2026-09-20'

type Section = { id: string; title: string; body: ReactNode }

const list = (items: string[]) => (
  <ul className="mt-3 space-y-2">
    {items.map((item) => (
      <li key={item} className="flex gap-2.5 font-body-md text-body-md text-on-surface-variant">
        <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

const p = (children: ReactNode) => (
  <p className="mt-3 font-body-md text-body-md text-on-surface-variant">{children}</p>
)

const SECTIONS: Section[] = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    body: (
      <>
        {p(
          'When you use our website, request an itinerary, make an enquiry, or contact us, we may collect information such as:',
        )}
        {list([
          'Full name',
          'Phone number',
          'Email address',
          'Company name, where applicable',
          'Preferred travel dates',
          'Number of travelers',
          'Travel preferences and requirements',
          'Information you voluntarily provide in your enquiry',
          'Any other information necessary to arrange or provide our travel services',
        ])}
        {p(
          'We may also automatically collect limited technical information, such as your IP address, browser type, device type, and website usage information, where applicable.',
        )}
      </>
    ),
  },
  {
    id: 'how-we-use-your-information',
    title: '2. How We Use Your Information',
    body: (
      <>
        {p('We may use your information to:')}
        {list([
          'Respond to your enquiries and requests.',
          'Prepare and customize travel itineraries.',
          'Process and manage tour, hotel, transfer, and other travel arrangements.',
          'Communicate with you regarding your booking or enquiry.',
          'Provide customer support.',
          'Improve our website, services, and customer experience.',
          'Prevent fraud, misuse, or unauthorized activity.',
          'Comply with applicable legal and regulatory requirements.',
        ])}
        {p(
          'We will not use your personal information for purposes unrelated to our services without a lawful basis or your consent where required.',
        )}
      </>
    ),
  },
  {
    id: 'sharing-your-information',
    title: '3. Sharing Your Information',
    body: (
      <>
        {p(
          'We may share relevant information with trusted third-party service providers when necessary to provide the services you request.',
        )}
        {p('These may include:')}
        {list([
          'Hotels and accommodation providers',
          'Transportation and transfer providers',
          'Tour guides and activity providers',
          'Airlines or other travel service providers',
          'Payment service providers',
          'Technology and website service providers',
        ])}
        {p('We only share information that is reasonably necessary for the relevant service.')}
        {p(
          'We may also disclose information where required by law, regulation, court order, or governmental authority.',
        )}
      </>
    ),
  },
  {
    id: 'payment-information',
    title: '4. Payment Information',
    body: (
      <>
        {p(
          'Where online payments are available, payment transactions may be processed through third-party payment providers.',
        )}
        {p(
          'Imperial Tours does not intend to store complete payment card details on its own servers. Payment information may be handled directly by the relevant payment service provider in accordance with its own privacy and security policies.',
        )}
      </>
    ),
  },
  {
    id: 'cookies',
    title: '5. Cookies',
    body: (
      <>
        {p(
          'Our website may use cookies and similar technologies to improve website functionality, understand website usage, and enhance your experience.',
        )}
        {p(
          'You may be able to control or disable cookies through your browser settings. Disabling certain cookies may affect some website functionality.',
        )}
      </>
    ),
  },
  {
    id: 'data-security',
    title: '6. Data Security',
    body: (
      <>
        {p(
          'We take reasonable technical and organizational measures to protect your personal information against unauthorized access, loss, misuse, alteration, or disclosure.',
        )}
        {p(
          'However, no method of transmitting or storing information online can be guaranteed to be completely secure.',
        )}
      </>
    ),
  },
  {
    id: 'data-retention',
    title: '7. Data Retention',
    body: p(
      'We retain personal information only for as long as reasonably necessary to fulfill the purposes described in this Privacy Policy, provide our services, maintain business records, resolve disputes, and comply with applicable legal obligations.',
    ),
  },
  {
    id: 'your-rights',
    title: '8. Your Rights',
    body: (
      <>
        {p(
          'Depending on applicable law, you may have rights regarding your personal information, including the right to:',
        )}
        {list([
          'Request access to information we hold about you.',
          'Request correction of inaccurate information.',
          'Request deletion of your personal information where legally permitted.',
          'Object to or restrict certain processing.',
          'Withdraw consent where processing is based on consent.',
        ])}
        {p('To exercise any applicable rights, please contact us using the contact details provided on our website.')}
      </>
    ),
  },
  {
    id: 'third-party-websites',
    title: '9. Third-Party Websites',
    body: (
      <>
        {p('Our website may contain links to third-party websites or services.')}
        {p(
          'Imperial Tours is not responsible for the privacy practices, security, or content of third-party websites. We recommend reviewing their privacy policies before providing personal information.',
        )}
      </>
    ),
  },
  {
    id: 'childrens-privacy',
    title: '10. Children’s Privacy',
    body: p(
      'Our services are not specifically directed toward children. We do not knowingly collect personal information from children without appropriate consent where such consent is required by law.',
    ),
  },
  {
    id: 'changes-to-this-privacy-policy',
    title: '11. Changes to This Privacy Policy',
    body: (
      <>
        {p(
          'We may update this Privacy Policy from time to time to reflect changes in our services, technology, or legal requirements.',
        )}
        {p('Any updates will be published on this page with a revised “Last Updated” date.')}
      </>
    ),
  },
]

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> => {
  const { locale } = await params

  return {
    title: 'Privacy Policy',
    description:
      'How Imperial Tours collects, uses, stores, and protects your personal information.',
    alternates: buildAlternates(locale as Locale, PATH),
  }
}

const PrivacyPolicyPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  setRequestLocale(locale)

  const [settings, t] = await Promise.all([
    getSiteSettings(locale as Locale),
    getTranslations('nav'),
  ])

  const contact = settings.contact
  const lastUpdated = new Date(LAST_UPDATED).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      {/* --- hero -------------------------------------------------------------- */}
      <header className="relative overflow-hidden border-b border-hairline bg-surface-container-low">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.055] [background:radial-gradient(60rem_28rem_at_15%_-10%,theme(colors.brand.DEFAULT),transparent_70%)]"
        />
        <Container size="narrow" className="relative py-16 md:py-24">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-container-lowest px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-brand">
            <Icon name="shield" className="h-3.5 w-3.5" />
            Legal
          </span>
          <h1 className="font-display-hero text-display-hero-mobile leading-[1.08] text-primary md:text-[52px]">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-[62ch] font-body-lg text-body-lg text-on-surface-variant">
            At Imperial Tours, we respect your privacy and are committed to protecting your
            personal information. This Privacy Policy explains how we collect, use, store, and
            protect information when you visit or use our website and services.
          </p>
          <p className="mt-6 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant/70">
            Last updated: {lastUpdated}
          </p>
        </Container>
      </header>

      {/* --- content ------------------------------------------------------------ */}
      <Container size="narrow" className="py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          {/* Table of contents — sticky on desktop, a plain stack on mobile. */}
          <nav aria-label="Sections" className="hidden lg:block">
            <div className="sticky top-28">
              <p className="mb-4 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant/70">
                On this page
              </p>
              <ul className="space-y-2.5 border-l border-hairline pl-4">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-brand"
                    >
                      {section.title.replace(/^\d+\.\s*/, '')}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="#contact-us"
                    className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-brand"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </nav>

          <div className="min-w-0">
            <div className="stagger space-y-12">
              {SECTIONS.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  style={{ '--i': index } as React.CSSProperties}
                  className="scroll-mt-28"
                >
                  <h2 className="font-headline-card text-headline-card text-primary">
                    {section.title}
                  </h2>
                  {section.body}
                </section>
              ))}

              {/* --- contact -------------------------------------------------- */}
              <section id="contact-us" className="scroll-mt-28">
                <h2 className="font-headline-card text-headline-card text-primary">
                  12. Contact Us
                </h2>
                <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                  If you have any questions about this Privacy Policy or how your personal
                  information is handled, please contact us:
                </p>

                <div className="glass-panel mt-6 rounded-2xl p-6 md:p-8">
                  <p className="font-headline-card text-lg text-primary">{settings.brandName}</p>
                  <ul className="mt-4 space-y-3">
                    {contact.email ? (
                      <li className="flex items-center gap-3">
                        <Icon name="mail" className="h-4 w-4 shrink-0 text-brand" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="font-body-md text-body-md text-on-surface-variant hover:text-brand"
                        >
                          {contact.email}
                        </a>
                      </li>
                    ) : null}
                    {contact.phone || contact.whatsappNumber ? (
                      <li className="flex items-center gap-3">
                        <Icon name="phone" className="h-4 w-4 shrink-0 text-brand" />
                        <span className="font-body-md text-body-md text-on-surface-variant">
                          {contact.phone || contact.whatsappNumber}
                        </span>
                      </li>
                    ) : null}
                    {contact.address ? (
                      <li className="flex items-center gap-3">
                        <Icon name="pin" className="h-4 w-4 shrink-0 text-brand" />
                        <span className="font-body-md text-body-md text-on-surface-variant">
                          {contact.address}
                        </span>
                      </li>
                    ) : null}
                  </ul>

                  {!contact.email && !contact.phone && !contact.address ? (
                    <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                      Reach us through the details on our{' '}
                      <Link href="/contact" className="text-brand underline underline-offset-2">
                        {t('contact')}
                      </Link>{' '}
                      page.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default PrivacyPolicyPage
