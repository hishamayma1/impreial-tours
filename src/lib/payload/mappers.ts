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
/**
 * Uploads are served straight out of `public/media` (see Media.upload.staticDir), so
 * the front end wants `/media/<filename>` rather than the `/api/media/file/<filename>`
 * URL Payload stores. That keeps image reads off Payload's REST layer entirely, and
 * makes the path local as far as `next/image` is concerned — no HTTP round trip back
 * into this server just to optimize our own file.
 *
 * Falls back to whatever Payload recorded when a document predates this and carries no
 * filename, so an older row degrades to the slower URL instead of to a broken image.
 */
const publicUrl = (filename: string, fallback: string): string =>
  filename ? `/media/${filename}` : fallback

export const toImage = (value: unknown, sizePreference?: string): ImageVM | null => {
  if (!value || typeof value !== 'object') return null
  const doc = value as Doc
  const size = sizePreference ? doc.sizes?.[sizePreference] : undefined

  // Size variant first, then the original — mirroring the old `size.url || doc.url`
  // chain, so a variant that was never generated still falls back to the full image.
  const url =
    publicUrl(str(size?.filename), str(size?.url)) || publicUrl(str(doc.filename), str(doc.url))
  if (!url) return null

  return {
    url,
    alt: str(doc.alt),
    width: size?.width ?? doc.width ?? undefined,
    height: size?.height ?? doc.height ?? undefined,
  }
}

const toId = (doc: Doc): string => String(doc.id ?? doc._id ?? '')

/**
 * Legacy CMS paths, remapped onto the routes that actually exist.
 *
 * `href` on Services and Offers is a free-text field, and the seeded content was
 * authored against an earlier route plan: `/tours/packages`, `/stays` and
 * `/tours/cycling` were renamed to `/tours/experiences`, `/hotels` and `/bicycles`,
 * and `/offers/<slug>` never shipped a route at all. Six of the seven home-page CTAs
 * were 404ing as a result.
 *
 * Fixing it here rather than only in the seed means live documents are corrected
 * without a re-seed (`npm run seed` replaces every content collection, which is not a
 * thing to do to a database over a broken link), and a typo of an old path by an
 * editor still lands somewhere real. `seed/data.ts` carries the correct paths too, so
 * a fresh install never depends on this.
 *
 * Delete an entry once no document uses it.
 */
const LEGACY_PATHS: Record<string, string> = {
  '/tours/packages': '/tours/experiences',
  '/stays': '/hotels',
  '/tours/cycling': '/bicycles',
  '/tours/bicycles': '/bicycles',
  '/offers': '/tours/experiences',
  /**
   * `/tours` is a real route now — the combined catalogue — so it is no longer
   * remapped and simply passes through.
   *
   * `/destinations` still is: destinations are a filter over that catalogue rather
   * than pages of their own, and the catalogue is where the destination filter lives,
   * so it is a better landing place than the day-tours listing it used to point at.
   */
  '/destinations': '/tours',
  /**
   * The checkout route is `/booking/[type]`; bare `/booking` has no page, and the
   * Header global's "Book Now" CTA pointed at it — so the primary call to action
   * 404'd on every page of the site.
   *
   * It resolves to the day-tours listing rather than to `/booking/tour` because the
   * wizard opens from an item snapshot: sent to checkout with nothing selected, a
   * visitor gets an empty form. Browse first is also what `buildDefaultCta` already
   * does, so the CMS value and the code default now agree.
   */
  '/booking': '/tours/daily',
}

export const normalizePath = (href: string, fallback: string): string => {
  const path = href.trim() || fallback
  if (LEGACY_PATHS[path]) return LEGACY_PATHS[path]
  // `/offers/<anything>`: the collection is real, the route family is not.
  if (path === '/offers' || path.startsWith('/offers/')) return LEGACY_PATHS['/offers']
  return path
}

export const toService = (doc: Doc): ServiceVM => ({
  id: toId(doc),
  title: str(doc.title),
  description: str(doc.description),
  icon: str(doc.icon) || null,
  href: normalizePath(str(doc.href), '/tours/daily'),
  image: toImage(doc.image, 'card'),
})

export const toOffer = (doc: Doc): OfferVM => ({
  id: toId(doc),
  title: str(doc.title),
  href: normalizePath(str(doc.href), '/tours/experiences'),
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
    plan: toHeading(doc.planSection),
  },
  seo: {
    title: str(doc.seoTitle),
    description: str(doc.seoDescription),
    image: toImage(doc.seoImage, 'og'),
  },
})

/**
 * Chrome links go through the same normalizer as the content ones. The Header global
 * shipped with `/booking`, `/tours` and `/destinations` — none of them routes — so the
 * nav and the "Book Now" CTA were dead on every page.
 */
export const toHeader = (doc: Doc): HeaderVM => ({
  navItems: Array.isArray(doc.navItems)
    ? doc.navItems
        .filter((item: Doc) => str(item?.label))
        .map((item: Doc) => ({
          label: str(item.label),
          href: normalizePath(str(item.href), '/'),
          children: Array.isArray(item.children)
            ? item.children
                .filter((child: Doc) => str(child?.label))
                .map((child: Doc) => ({
                  label: str(child.label),
                  href: normalizePath(str(child.href), '/'),
                }))
            : undefined,
        }))
    : [],
  cta: str(doc.cta?.label)
    ? { label: str(doc.cta.label), href: normalizePath(str(doc.cta.href), '/tours/daily') }
    : null,
})

export const toFooter = (doc: Doc): FooterVM => ({
  blurb: str(doc.blurb),
  columns: Array.isArray(doc.columns)
    ? doc.columns.map((column: Doc) => ({
        title: str(column.title),
        links: Array.isArray(column.links)
          ? column.links.map((link: Doc) => ({
              label: str(link.label),
              href: normalizePath(str(link.href), '/'),
            }))
          : [],
      }))
    : [],
})

export const toSiteSettings = (doc: Doc): SiteSettingsVM => ({
  brandName: str(doc.brandName, 'IMPERIAL TOURS'),
  whatsappNumber: str(doc.contact?.whatsappNumber),
  contact: {
    email: str(doc.contact?.contactEmail),
    phone: str(doc.contact?.phone),
    whatsappNumber: str(doc.contact?.whatsappNumber),
    address: str(doc.contact?.address),
    businessHours: str(doc.contact?.businessHours),
  },
  socialLinks: Array.isArray(doc.socialLinks)
    ? doc.socialLinks
        .filter((link: Doc) => str(link?.url))
        .map((link: Doc) => ({ platform: str(link.platform), url: str(link.url) }))
    : [],
  // Absent settings mean "everything on" — a fresh install should not hide the site.
  enabledServices: Array.isArray(doc.enabledServices)
    ? doc.enabledServices.map((service: unknown) => String(service))
    : ['tours', 'hotels', 'transfers', 'bicycles'],
  enableCustomQuote: doc.enableCustomQuote !== false,
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
