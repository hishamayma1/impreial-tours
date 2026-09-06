/**
 * View models consumed by the UI layer.
 *
 * Components never import Payload's generated types directly — queries map CMS
 * documents into these shapes. That keeps a schema change inside src/lib/payload
 * instead of rippling through every component.
 */

export type ImageVM = {
  url: string
  alt: string
  width?: number
  height?: number
}

export type ServiceVM = {
  id: string
  title: string
  description: string
  icon: string | null
  href: string
  image: ImageVM | null
}

export type OfferBadgeVM = {
  text: string
  tone: 'glass' | 'solid'
}

export type OfferVM = {
  id: string
  title: string
  href: string
  badges: OfferBadgeVM[]
  image: ImageVM | null
}

export type DestinationVM = {
  id: string
  name: string
  slug: string
  summary: string
  image: ImageVM | null
}

export type TestimonialVM = {
  id: string
  quote: string
  author: string
  location: string
  portrait: ImageVM | null
}

export type PostVM = {
  id: string
  title: string
  excerpt: string
  slug: string
  category: string
  publishedAt: string
  image: ImageVM | null
}

export type SectionHeadingVM = {
  eyebrow: string
  title: string
  body: string
}

export type HomePageVM = {
  hero: {
    title: string
    subtitle: string
    image: ImageVM | null
    defaultDestination: string
  }
  sections: {
    services: SectionHeadingVM
    offers: SectionHeadingVM
    destinations: SectionHeadingVM
    testimonials: SectionHeadingVM
    plan: SectionHeadingVM
  }
  seo: {
    title: string
    description: string
    image: ImageVM | null
  }
}

export type NavItemVM = {
  label: string
  href: string
  /** Present on hub items that open a dropdown (Tours, Transfers). */
  children?: NavItemVM[]
}

/**
 * One card in a mega panel's recommendation rail — the shape every hub's spotlight
 * query (tours, hotels) is mapped down to, so the rail itself never has to know
 * whether it is showing a tour or a hotel.
 */
export type NavSpotlightItemVM = {
  id: string
  href: string
  title: string
  image: ImageVM | null
  priceFrom: number | null
  rating: number | null
}

export type HeaderVM = {
  navItems: NavItemVM[]
  cta: NavItemVM | null
}

export type FooterVM = {
  blurb: string
  columns: Array<{ title: string; links: NavItemVM[] }>
}

export type CurrencyVM = { code: string; symbol: string; rate: number }

export type SocialLinkVM = { platform: string; url: string }

/**
 * The parts of `contact` an editor fills in. These feed the JSON-LD `Organization`
 * block rather than any visible chrome, which is why every field is optional-by-
 * emptiness: a blank one is simply omitted from the payload instead of emitting an
 * empty property that answer engines would have to guess at.
 */
export type ContactVM = {
  email: string
  phone: string
  whatsappNumber: string
  address: string
  businessHours: string
}

export type SiteSettingsVM = {
  brandName: string
  logo: ImageVM | null
  currencies: CurrencyVM[]
  defaultSeo: { title: string; description: string; image: ImageVM | null }
  /** Spec Section 3 additions. */
  whatsappNumber: string
  contact: ContactVM
  socialLinks: SocialLinkVM[]
  enabledServices: string[]
  enableCustomQuote: boolean
}
