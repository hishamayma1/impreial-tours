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
    journal: SectionHeadingVM
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

export type HeaderVM = {
  navItems: NavItemVM[]
  cta: NavItemVM | null
}

export type FooterVM = {
  blurb: string
  columns: Array<{ title: string; links: NavItemVM[] }>
}

export type CurrencyVM = { code: string; symbol: string; rate: number }

export type SiteSettingsVM = {
  brandName: string
  logo: ImageVM | null
  currencies: CurrencyVM[]
  defaultSeo: { title: string; description: string; image: ImageVM | null }
}
