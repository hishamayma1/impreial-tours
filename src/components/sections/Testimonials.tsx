'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { SectionCta } from '@/components/ui/SectionCta'
import type { SectionHeadingVM, TestimonialVM } from '@/types/content'
import { cn, firstFilled } from '@/lib/utils'

const AUTOPLAY_MS = 6000

type TestimonialsProps = {
  heading: SectionHeadingVM
  testimonials: TestimonialVM[]
}

const Stars = ({ rating, label }: { rating: number; label: string }) => (
  <p className="flex gap-1 text-tertiary-fixed-dim" aria-label={label}>
    {Array.from({ length: 5 }, (_, index) => (
      <span key={index} aria-hidden className={index < rating ? undefined : 'text-white/20'}>
        ★
      </span>
    ))}
  </p>
)

const TestimonialCard = ({ item, ratingLabel }: { item: TestimonialVM; ratingLabel: string }) => (
  <figure className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.06] p-7 text-start backdrop-blur-sm md:p-8">
    <div className="flex items-start justify-between gap-4">
      <span aria-hidden className="font-display-hero text-6xl leading-[0.6] text-inverse-primary/60">
        &ldquo;
      </span>
      {item.rating ? <Stars rating={item.rating} label={ratingLabel} /> : null}
    </div>

    <blockquote className="mt-5 flex-1">
      <p className="font-headline-card text-lg leading-relaxed text-white md:text-xl">{item.quote}</p>
    </blockquote>

    <figcaption className="mt-7 flex items-center gap-4 border-t border-white/10 pt-6">
      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/15">
        {item.portrait ? (
          <CmsImage image={item.portrait} alt="" sizes="48px" />
        ) : (
          // No portrait uploaded: the author's initial, so the card never shows an empty disc.
          <span aria-hidden className="flex h-full w-full items-center justify-center font-headline-card text-lg text-white">
            {item.author.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 block font-headline-card text-lg leading-snug text-white">{item.author}</span>
        {item.location ? (
          <span className="block truncate font-body-md text-caption text-inverse-primary">{item.location}</span>
        ) : null}
      </span>
    </figcaption>
  </figure>
)

/**
 * Client testimonials as a carousel of cards, fed by the Testimonials collection —
 * publishing a new entry in the dashboard adds a card, and its `order` decides where.
 *
 * The track is the browser's own horizontal scroller with scroll-snap, not a
 * transform driven by state: a swipe on a phone is native momentum scrolling that
 * works before hydration, and the arrows, dots and autoplay only ever ask the track
 * to scroll. One card per view on phones (with the next one peeking in), two from
 * `sm`, three from `lg`.
 *
 * Autoplay advances one card every six seconds and stops for anyone reading: on
 * hover, while anything inside has focus, after a touch, while the tab is hidden,
 * and entirely under reduced motion.
 */
export const Testimonials = ({ heading, testimonials }: TestimonialsProps) => {
  const t = useTranslations('testimonials')
  const trackRef = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)
  const [paused, setPaused] = useState(false)
  const [touched, setTouched] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  /** Card pitch (width + gap) and how many scroll positions the track has right now. */
  const metrics = useCallback(() => {
    const track = trackRef.current
    const first = track?.firstElementChild as HTMLElement | null
    if (!track || !first) return null
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    const pitch = first.offsetWidth + gap
    const perView = Math.max(1, Math.round((track.clientWidth - parseFloat(getComputedStyle(track).paddingLeft) + gap) / pitch))
    return { track, pitch, pageCount: Math.max(1, track.children.length - perView + 1) }
  }, [])

  const sync = useCallback(() => {
    const m = metrics()
    if (!m) return
    setPages(m.pageCount)
    setPage(Math.min(m.pageCount - 1, Math.round(m.track.scrollLeft / m.pitch)))
  }, [metrics])

  const goTo = useCallback(
    (target: number) => {
      const m = metrics()
      if (!m) return
      const next = ((target % m.pageCount) + m.pageCount) % m.pageCount
      m.track.scrollTo({ left: next * m.pitch, behavior: reducedMotion ? 'auto' : 'smooth' })
    },
    [metrics, reducedMotion],
  )

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        sync()
      })
    }
    sync()
    track.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [sync, testimonials.length])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (paused || touched || reducedMotion || pages < 2) return
    const timer = window.setInterval(() => {
      if (!document.hidden) goTo(page + 1)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [paused, touched, reducedMotion, pages, page, goTo])

  if (testimonials.length === 0) return null

  const title = firstFilled(heading.title, t('title'))
  const arrowClass =
    'flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors duration-200 ' +
    'hover:border-white hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

  const arrows = (className?: string) => (
    <div className={cn('gap-3', className)}>
      <button type="button" onClick={() => goTo(page - 1)} aria-label={t('previous')} className={arrowClass}>
        <Icon name="chevron-left" className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => goTo(page + 1)} aria-label={t('next')} className={arrowClass}>
        <Icon name="chevron-right" className="h-5 w-5" />
      </button>
    </div>
  )

  return (
    <section
      className="relative overflow-hidden bg-brand py-16 md:py-section-v-padding"
      aria-labelledby="testimonials-heading"
    >
      <Container className="relative z-10">
        <div className="flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-start">
          <div>
            <span className="mb-4 block font-label-caps text-label-caps uppercase tracking-widest text-inverse-primary">
              {firstFilled(heading.eyebrow, t('eyebrow'))}
            </span>
            <h2 id="testimonials-heading" className="font-headline-section text-headline-section text-white">
              {title}
            </h2>
          </div>

          {/* Beside the heading from `md`; on phones the arrows sit under the cards. */}
          {pages > 1 ? arrows('hidden md:flex') : null}
        </div>

        <ul
          ref={trackRef}
          aria-roledescription="carousel"
          aria-label={title}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          // A swipe means the visitor has taken over; autoplay stays off after it.
          onTouchStart={() => setTouched(true)}
          className={cn(
            'mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 md:mt-12 md:gap-6',
            // Bleeds to the screen edge on phones so the next card peeks in.
            '-mx-6 scroll-px-6 px-6 md:mx-0 md:scroll-px-0 md:px-0',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {testimonials.map((item, index) => (
            <li
              key={item.id}
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${testimonials.length}`}
              className="w-[86%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
            >
              <TestimonialCard
                item={item}
                ratingLabel={item.rating ? t('rating', { rating: item.rating }) : ''}
              />
            </li>
          ))}
        </ul>

        {pages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-4">
            {arrows('flex md:hidden')}
            <div className="flex items-center gap-1">
              {Array.from({ length: pages }, (_, dot) => (
                <button
                  key={dot}
                  type="button"
                  onClick={() => goTo(dot)}
                  aria-label={t('goTo', { index: dot + 1 })}
                  aria-current={dot === page}
                  // The tap area is 32px tall; only the visible bar inside it is small.
                  className="group/dot flex h-8 items-center justify-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'block h-1.5 rounded-full transition-all duration-300',
                      dot === page ? 'w-7 bg-white' : 'w-1.5 bg-white/30 group-hover/dot:bg-white/60',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/*
          The strongest point on the page to ask: the visitor has just read someone
          else vouching for the trip. Light tone, because this band is navy.
        */}
        <SectionCta
          tone="light"
          primary={{ label: t('ctaPrimary'), href: '#plan' }}
          secondary={{ label: t('ctaSecondary'), href: '/tours/experiences' }}
          className="mt-10 md:mt-12"
        />
      </Container>
    </section>
  )
}
