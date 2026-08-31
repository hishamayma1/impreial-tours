'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { CmsImage } from '@/components/ui/CmsImage'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import type { GalleryItemVM } from '@/types/services'

/** Tiles shown in the grid. Anything beyond this is reachable through the lightbox. */
const VISIBLE_TILES = 8

type TourGalleryProps = {
  images: GalleryItemVM[]
  /** Falls back as alt text for any image whose row carries no caption. */
  title: string
}

/**
 * The tour gallery: a grid of thumbnails, each opening a full-screen view.
 *
 * The grid keeps its original shape — the first image spans two columns, so the set
 * has a focal point rather than reading as a uniform contact sheet — and every tile is
 * now a real `<button>`. That matters more than it looks: a click target built from a
 * `<div>` and an onClick is invisible to the keyboard and unannounced to a screen
 * reader, and this one is the only route to the full-size photograph.
 *
 * Client-side because a lightbox is interaction, but the cost is bounded: the markup
 * is server-rendered like any other component, the overlay does not exist in the DOM
 * until something is opened, and only the image being looked at is ever requested.
 */
export const TourGallery = ({ images, title }: TourGalleryProps) => {
  const t = useTranslations('services')

  /** The open image's index, or null when the lightbox is closed. */
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  /**
   * The tile that opened the lightbox.
   *
   * Focus has to go back to it on close. Without this, dismissing the overlay drops
   * focus onto `<body>` and a keyboard user restarts from the top of the document —
   * having just been sent to the bottom of the page.
   */
  const openerRef = useRef<HTMLElement | null>(null)

  const total = images.length
  const close = useCallback(() => setOpenIndex(null), [])

  // Wrapping rather than clamping: at the last image, "next" returns to the first.
  // A gallery is a loop, and a dead arrow button reads as a broken one.
  const step = useCallback(
    (delta: number) => setOpenIndex((current) => (current === null ? null : (current + delta + total) % total)),
    [total],
  )

  const open = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    openerRef.current = event.currentTarget
    setOpenIndex(index)
  }

  useEffect(() => {
    if (openIndex === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(1)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(-1)
        return
      }

      /**
       * A minimal focus trap.
       *
       * `aria-modal` tells assistive technology the rest of the page is inert, but it
       * does nothing to Tab: without this, tabbing out of the overlay lands on the
       * page behind it, which is still scrolled to wherever it was and now covered by
       * a black sheet. Cycling within the dialog's own focusable elements keeps the
       * two claims consistent.
       */
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button')
        if (!focusable?.length) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    // The page behind must not scroll under the overlay — on a phone especially,
    // where a swipe would otherwise carry the document instead of doing nothing.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
    // Only the open/closed transition should re-run this; `openIndex` changing from 2
    // to 3 must not re-lock the body or steal focus back to the close button
    // mid-browse. `opened` collapses the index to that one bit.
  }, [openIndex === null, close, step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus returns to the opening tile once the overlay is gone.
  useEffect(() => {
    if (openIndex !== null) return
    openerRef.current?.focus()
    openerRef.current = null
  }, [openIndex])

  if (!images.length) return null

  const tiles = images.slice(0, VISIBLE_TILES)
  const hidden = total - tiles.length
  const active = openIndex === null ? null : images[openIndex]
  // The full variant is what the lightbox is for; the card crop is the fallback for a
  // Media document whose larger sizes were never generated.
  const activeSource = active ? (active.full ?? active.image) : null

  const navButton =
    'focus-card grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 bg-black/40 text-white transition-colors duration-200 hover:border-white/60 hover:bg-black/70'

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((entry, index) => {
          const isLastTile = index === tiles.length - 1
          const showsMore = hidden > 0 && isLastTile

          return (
            <li
              key={entry.image?.url ?? index}
              className={index === 0 ? 'col-span-2 row-span-2' : undefined}
            >
              <button
                type="button"
                onClick={(event) => open(index, event)}
                aria-label={t('galleryOpen', {
                  label: entry.caption || title,
                  index: String(index + 1),
                  total: String(total),
                })}
                className="focus-card group relative block h-full w-full overflow-hidden rounded-xl bg-surface-container"
              >
                <div className={index === 0 ? 'aspect-square' : 'aspect-[4/3]'}>
                  <CmsImage
                    image={entry.image}
                    alt={entry.caption || title}
                    sizes={
                      index === 0 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'
                    }
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/*
                  The expand glyph appears on hover and on keyboard focus alike. Hover
                  alone would leave the affordance invisible to anyone arriving by Tab,
                  and invisible entirely on a touch screen — hence the scrim underneath
                  it, which is always present at low opacity.
                */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-3 grid h-8 w-8 translate-y-1 place-items-center rounded-full bg-white/90 text-primary opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                >
                  <ExpandIcon />
                </span>

                {entry.caption && !showsMore ? (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-start font-body-md text-caption text-white">
                    {entry.caption}
                  </span>
                ) : null}

                {/*
                  The overflow count is on the last visible tile rather than in a
                  separate "see all" link: it sits where the eye already is, and it
                  opens the same viewer at the same place.
                */}
                {showsMore ? (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-brand/70 font-headline-card text-headline-card text-white backdrop-blur-[2px]">
                    {t('galleryMore', { count: String(hidden) })}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {active && activeSource
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={t('galleryLabel')}
              className="fixed inset-0 z-[100] flex flex-col bg-black/95"
            >
              {/* --- top bar: counter and close ------------------------------ */}
              <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 md:px-6">
                <span className="font-body-md text-caption tabular-nums text-white/70">
                  {t('galleryCount', {
                    current: String((openIndex ?? 0) + 1),
                    total: String(total),
                  })}
                </span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label={t('galleryClose')}
                  className={navButton}
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>

              {/* --- the image ----------------------------------------------- */}
              <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-4">
                {/*
                  Clicking the backdrop closes, which is what everyone expects of a
                  lightbox. It is a real button so the gesture is not keyboard-only
                  dead weight, and it sits *behind* the image so a click on the
                  photograph itself does not dismiss it.
                */}
                <button
                  type="button"
                  aria-label={t('galleryClose')}
                  tabIndex={-1}
                  onClick={close}
                  className="absolute inset-0 h-full w-full cursor-zoom-out"
                />

                {/*
                  The maximisation, and the sizing is load-bearing rather than
                  decorative.

                  `h-full` is what makes the picture grow: `width/height: auto` sizes a
                  replaced element to its *natural* pixels, and `max-h-full` only ever
                  caps that — so an image smaller than the viewport stayed at its
                  natural size in the middle of a black screen, which is the opposite
                  of what opening it is for. Height drives, `w-auto` follows the aspect
                  ratio, `max-w-full` catches the wide-image case, and `object-contain`
                  guarantees the picture is letterboxed rather than distorted whenever
                  that clamp bites.

                  Deliberately not keyed on the index: reusing one element lets the
                  browser swap the source in place instead of tearing the image down
                  and rebuilding it on every arrow press.
                */}
                <Image
                  src={activeSource.url}
                  alt={active.caption || title}
                  width={activeSource.width ?? 2400}
                  height={activeSource.height ?? 1600}
                  sizes="100vw"
                  priority
                  // `relative` lifts it above the backdrop button, so a click that
                  // lands on the photograph is absorbed rather than closing the view.
                  className="relative h-full w-auto max-w-full object-contain"
                />

                {total > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      aria-label={t('galleryPrev')}
                      className={cn(navButton, 'absolute start-2 top-1/2 -translate-y-1/2 md:start-6')}
                    >
                      <Icon name="chevron-left" className="h-5 w-5 rtl:rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label={t('galleryNext')}
                      className={cn(navButton, 'absolute end-2 top-1/2 -translate-y-1/2 md:end-6')}
                    >
                      <Icon name="chevron-right" className="h-5 w-5 rtl:rotate-180" />
                    </button>
                  </>
                ) : null}
              </div>

              {/* --- caption -------------------------------------------------- */}
              <div className="shrink-0 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
                {active.caption ? (
                  <p className="mx-auto max-w-2xl font-body-md text-body-md text-white/85">
                    {active.caption}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

/** Four corner brackets — the conventional "expand to full size" glyph. */
const ExpandIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-3.5 w-3.5"
  >
    <path d="M6 2H2v4M10 2h4v4M10 14h4v-4M6 14H2v-4" />
  </svg>
)
