import type {
  DestinationVM,
  FooterVM,
  HeaderVM,
  HomePageVM,
  ImageVM,
  OfferVM,
  PostVM,
  SectionHeadingVM,
  ServiceVM,
  SiteSettingsVM,
  TestimonialVM,
} from '@/types/content'

type Doc = Record<string, any>

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback

/**
 * Upload relations arrive either as an ObjectId string (depth 0) or a populated
 * document. Only the latter can be rendered, so anything else becomes null and the
 * component decides how to degrade.
 */
export const toImage = (value: unknown, sizePreference?: string): ImageVM | null => {
  if (!value || typeof value !== 'object') return null
  const doc = value as Doc
  const size = sizePreference ? doc.sizes?.[sizePreference] : undefined
  const url = str(size?.url) || str(doc.url)
  if (!url) return null

  return {
    url,
    alt: str(doc.alt),
    width: size?.width ?? doc.width ?? undefined,
    height: size?.height ?? doc.height ?? undefined,
  }
}

const toId = (doc: Doc): string => String(doc.id ?? doc._id ?? '')

export const toService = (doc: Doc): ServiceVM => ({
  id: toId(doc),
  title: str(doc.title),
  description: str(doc.description),
  icon: str(doc.icon) || null,
  href: str(doc.href, '/tours'),
  image: toImage(doc.image, 'card'),
})

export const toOffer = (doc: Doc): OfferVM => ({
  id: toId(doc),
  title: str(doc.title),
  href: str(doc.href, '/offers'),
  badges: Array.isArray(doc.badges)
    ? doc.badges
        .filter((badge: Doc) => str(badge?.text))
        .map((badge: Doc) => ({
          text: str(badge.text),
          tone: badge.tone === 'solid' ? ('solid' as const) : ('glass' as const),
        }))
    : [],
  image: toImage(doc.image, 'wide'),
})

export const toDestination = (doc: Doc): DestinationVM => ({
  id: toId(doc),
  name: str(doc.name),
  slug: str(doc.slug),
  summary: str(doc.summary),
  image: toImage(doc.image, 'portrait'),
})

export const toTestimonial = (doc: Doc): TestimonialVM => ({
  id: toId(doc),
  quote: str(doc.quote),
  author: str(doc.author),
  location: str(doc.location),
  portrait: toImage(doc.portrait, 'thumbnail'),
})

export const toPost = (doc: Doc): PostVM => ({
  id: toId(doc),
  title: str(doc.title),
  excerpt: str(doc.excerpt),
  slug: str(doc.slug),
  category: typeof doc.category === 'object' ? str(doc.category?.title) : '',
  publishedAt: str(doc.publishedAt, new Date().toISOString()),
  image: toImage(doc.heroImage, 'card'),
})

const toHeading = (doc: unknown): SectionHeadingVM => {
  const group = (doc ?? {}) as Doc
  return {
    eyebrow: str(group.eyebrow),
    title: str(group.title),
    body: str(group.body),
  }
}

export const toHomePage = (doc: Doc): HomePageVM => ({
  hero: {
    title: str(doc.hero?.title),
    subtitle: str(doc.hero?.subtitle),
    image: toImage(doc.hero?.image, 'hero'),
    defaultDestination: str(doc.hero?.defaultDestination),
  },
  sections: {
    services: toHeading(doc.servicesSection),
    offers: toHeading(doc.offersSection),
    destinations: toHeading(doc.destinationsSection),
    testimonials: toHeading(doc.testimonialsSection),
    journal: toHeading(doc.journalSection),
  },
  seo: {
    title: str(doc.seoTitle),
    description: str(doc.seoDescription),
    image: toImage(doc.seoImage, 'og'),
  },
})

export const toHeader = (doc: Doc): HeaderVM => ({
  navItems: Array.isArray(doc.navItems)
    ? doc.navItems
        .filter((item: Doc) => str(item?.label))
        .map((item: Doc) => ({ label: str(item.label), href: str(item.href, '/') }))
    : [],
  cta: str(doc.cta?.label)
    ? { label: str(doc.cta.label), href: str(doc.cta.href, '/booking') }
    : null,
})

export const toFooter = (doc: Doc): FooterVM => ({
  blurb: str(doc.blurb),
  columns: Array.isArray(doc.columns)
    ? doc.columns.map((column: Doc) => ({
        title: str(column.title),
        links: Array.isArray(column.links)
          ? column.links.map((link: Doc) => ({ label: str(link.label), href: str(link.href, '/') }))
          : [],
      }))
    : [],
})

export const toSiteSettings = (doc: Doc): SiteSettingsVM => ({
  brandName: str(doc.brandName, 'IMPERIAL TOURS'),
  logo: toImage(doc.logo, 'thumbnail'),
  currencies: Array.isArray(doc.currencies)
    ? doc.currencies
        .filter((currency: Doc) => str(currency?.code))
        .map((currency: Doc) => ({
          code: str(currency.code),
          symbol: str(currency.symbol, '$'),
          rate: typeof currency.rate === 'number' ? currency.rate : 1,
        }))
    : [],
  defaultSeo: {
    title: str(doc.defaultSeo?.title),
    description: str(doc.defaultSeo?.description),
    image: toImage(doc.defaultSeo?.ogImage, 'og'),
  },
})
