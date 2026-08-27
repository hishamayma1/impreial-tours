'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { CmsImage } from '@/components/ui/CmsImage'
import { Icon } from '@/components/ui/Icon'
import type { OfferVM } from '@/types/content'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 7000
const SWIPE_THRESHOLD_PX = 48

/**
 * Limited-Edition Offers carousel.
 *
 * A transform-driven track rather than a scroll container, so the active slide is
 * unambiguous for both the pagination dots and assistive technology. Autoplay is
 * suspended on hover, on focus, while the tab is hidden, and whenever the visitor
 * prefers reduced motion.
 */
export const OffersCarousel = ({ offers }: { offers: OfferVM[] }) => {
  const t = useTranslations('offers')
  const groupId = useId()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const count = offers.length

  const goTo = useCallback(
    (target: number) => {
      if (count === 0) return
      setIndex(((target % count) + count) % count)
    },
    [count],
  )

  const goNext = useCallback(() => goTo(index + 1), [goTo, index])
  const goPrevious = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [paused, reducedMotion, count])

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goNext()
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goPrevious()
    }
  }

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current
    const end = event.changedTouches[0]?.clientX
    touchStartX.current = null
    if (start == null || end == null) return
    const delta = end - start
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
    if (delta < 0) goNext()
    else goPrevious()
  }

  if (count === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-outline-variant p-12 text-center font-body-md text-on-surface-variant">
        {t('empty')}
      </p>
    )
  }

  /**
   * The controls sit in a row beneath the image rather than floating over it.
   *
   * Overlaid, they were `opacity-0` until the carousel was hovered — which meant they
   * did not exist at all for touch, where there is no hover, and they sat on top of
   * the photograph they were asking you to look at. Below the image they are always
   * visible, they are a real hit target on a phone, and they no longer need to be
   * white-on-glass to survive whatever image is behind them.
   */
  const arrowClass =
    'flex h-10 w-10 items-center justify-center rounded-full border border-hairline ' +
    'bg-surface-container-lowest text-brand transition-colors hover:bg-brand hover:text-white ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ' +
    'focus-visible:ring-offset-2 disabled:opacity-40'

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={t('title')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={onTouchEnd}
    >
      <CarouselTrack
        offers={offers}
        index={index}
        groupId={groupId}
        reducedMotion={reducedMotion}
        cta={t('cta')}
      />

      {count > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={goPrevious}
            aria-label={t('previous')}
            className={arrowClass}
          >
            <Icon name="chevron-left" className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {offers.map((offer, dotIndex) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => goTo(dotIndex)}
                aria-label={t('goTo', { index: dotIndex + 1 })}
                aria-current={dotIndex === index}
                className={cn(
                  // A 2px dot is far below the 24px minimum touch target, so the tap
                  // area is padded out around it while the dot itself stays small.
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'block h-2 w-2 rounded-full transition-colors',
                    dotIndex === index ? 'bg-brand' : 'bg-brand/25 hover:bg-brand/50',
                  )}
                />
              </button>
            ))}
          </div>

          <button type="button" onClick={goNext} aria-label={t('next')} className={arrowClass}>
            <Icon name="chevron-right" className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

type CarouselTrackProps = {
  offers: OfferVM[]
  index: number
  groupId: string
  reducedMotion: boolean
  cta: string
}

const CarouselTrack = ({ offers, index, groupId, reducedMotion, cta }: CarouselTrackProps) => (
  <div className="overflow-hidden rounded-2xl shadow-lg">
    <div
      className={cn('flex', !reducedMotion && 'transition-transform duration-700 ease-in-out')}
      style={{ transform: 'translate3d(-' + index * 100 + '%, 0, 0)' }}
    >
      {offers.map((offer, slideIndex) => (
        <article
          key={offer.id}
          id={groupId + '-slide-' + slideIndex}
          aria-roledescription="slide"
          aria-label={slideIndex + 1 + ' / ' + offers.length}
          aria-hidden={slideIndex !== index}
          className="relative aspect-[16/9] w-full flex-shrink-0 overflow-hidden"
        >
          {/*
            The whole slide is the link, not just the button: the image and headline
            are the obvious things to click, and a lone button inside a large tappable
            card is a small target on a phone. A nested <a> inside an <a> is invalid,
            so the "Discover" affordance below renders as a <span> styled like the
            button rather than as a second link.

            `tabIndex={-1}` on the off-screen slides keeps them out of the tab order —
            they are `aria-hidden`, and a focusable node inside a hidden subtree is
            exactly the trap that makes a carousel unusable with a keyboard.
          */}
          <Link
            href={offer.href}
            tabIndex={slideIndex === index ? undefined : -1}
            className="group block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
          >
            {/*
              Deliberately NOT `priority`. The offers band is the third section of the
              home page, below a 90vh hero, so it is never the LCP element — but
              `priority` emits a high-priority preload in <head>, which put a large
              offer image in direct competition with the hero for the first bytes on
              every home-page load. Lazy is correct here: by the time this scrolls into
              view the browser has already fetched it.
            */}
            <CmsImage
              image={offer.image}
              sizes="(max-width: 768px) 100vw, 60vw"
              className="transition-transform duration-700 group-hover:scale-105"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-brand/80 via-brand/20 to-transparent"
            />

            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center p-8 md:w-2/3 md:p-12">
              {offer.badges.length > 0 ? (
                <ul className="mb-6 flex flex-wrap gap-3">
                  {offer.badges.map((badge) => (
                    <li
                      key={badge.text}
                      className={cn(
                        'rounded-full px-3 py-1 font-label-caps text-xs uppercase tracking-wider text-white',
                        badge.tone === 'solid' ? 'bg-brand' : 'bg-white/20 backdrop-blur-sm',
                      )}
                    >
                      {badge.text}
                    </li>
                  ))}
                </ul>
              ) : null}

              <h3 className="mb-8 font-headline-card text-3xl leading-tight text-white md:text-4xl">
                {offer.title}
              </h3>

              <div>
                {/*
                  A span, not a link — the whole slide is already the anchor. It keeps
                  the button's look and its hover state follows the slide's `group`.
                */}
                <span className="inline-flex items-center justify-center rounded-full border border-white/70 px-8 py-4 font-label-caps text-label-caps uppercase tracking-widest text-white transition-colors group-hover:bg-white group-hover:text-brand">
                  {cta}
                </span>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  </div>
)
