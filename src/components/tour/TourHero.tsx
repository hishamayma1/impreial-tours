import { getTranslations } from 'next-intl/server'

import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Link } from '@/i18n/navigation'
import { FactIcon } from '@/components/services/FactIcon'
import type { ImageVM } from '@/types/content'

type HeroFact = { icon: 'clock' | 'calendar' | 'signal' | 'users' | 'globe' | 'moon'; label: string; value: string }

type TourHeroProps = {
  title: string
  summary: string
  image: ImageVM | null
  badge?: string | null
  rating?: number | null
  facts: HeroFact[]
  breadcrumb: { label: string; href: string }
}

/**
 * The immersive header for a tour page.
 *
 * The image is full-bleed with the title laid over it, so the page opens on the place
 * rather than on a heading. Three details make that readable rather than merely
 * pretty:
 *
 *  - A two-stop gradient scrim under the text only. Dimming the whole image to make
 *    white text legible wastes the photograph; a bottom-weighted scrim keeps the top
 *    two thirds untouched.
 *  - The image is `priority` — it is the LCP element on this page, and the only one
 *    that should be.
 *  - Text sits in a max-w-3xl column so the measure stays readable on a 21:9 monitor.
 */
export const TourHero = async ({
  title,
  summary,
  image,
  badge,
  rating,
  facts,
  breadcrumb,
}: TourHeroProps) => {
  const t = await getTranslations('services')

  return (
    <header className="relative isolate flex min-h-[26rem] items-end overflow-hidden bg-primary md:min-h-[34rem]">
      <div className="absolute inset-0 -z-10">
        <CmsImage
          image={image}
          alt={title}
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/10"
        />
      </div>

      <Container className="relative py-10 md:py-14">
        <nav aria-label={t('breadcrumb')} className="mb-6">
          <Link
            href={breadcrumb.href}
            className="focus-card inline-flex items-center gap-2 rounded-sm font-body-md text-caption text-white/80 transition-colors hover:text-white"
          >
            <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
              <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {breadcrumb.label}
          </Link>
        </nav>

        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {badge ? (
              <span className="rounded-full bg-brand px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-on-primary">
                {t(`badge.${badge}`)}
              </span>
            ) : null}
            {rating ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-body-md text-caption text-white backdrop-blur-sm">
                <span aria-hidden>★</span>
                <span className="sr-only">{t('fact.ratingLabel')}: </span>
                {rating.toFixed(1)}
              </span>
            ) : null}
          </div>

          <h1 className="font-display-hero text-display-hero-mobile leading-[1.05] text-white md:text-[52px]">
            {title}
          </h1>

          {summary ? (
            <p className="mt-5 max-w-[58ch] font-body-lg text-body-lg text-white/85">{summary}</p>
          ) : null}
        </div>

        {/* Key facts as a rail rather than a paragraph — these are the numbers a
            reader checks before anything else. */}
        {facts.length ? (
          <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-5 border-t border-white/20 pt-6">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="mb-1 flex items-center gap-1.5 font-label-caps text-label-caps uppercase tracking-widest text-white/60">
                  <FactIcon icon={fact.icon} className="h-3.5 w-3.5" />
                  {fact.label}
                </dt>
                <dd className="font-headline-card text-body-lg text-white">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Container>
    </header>
  )
}
