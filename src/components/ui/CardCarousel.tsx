import type { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type CardCarouselProps = {
  /**
   * The desktop layout, from `md` up — normally the `md:grid-cols-*` classes the
   * section already had. Below `md` these never apply, because the element is a
   * flex scroller there rather than a grid.
   */
  className?: string
  /**
   * `ul` for real content, `div` for the loading skeletons — a skeleton is decorative
   * and has no list to announce. Both get identical metrics, which is the point of
   * routing them through one component: the skeleton cannot drift out of step with
   * the row it stands in for, so the swap costs no layout shift at any width.
   */
  as?: ElementType
  children: ReactNode
}

/**
 * A row of cards that is a swipe carousel on phones and a plain grid from `md` up.
 *
 * Built entirely in CSS. There is no JavaScript, no state and no library: the browser's
 * own overflow scrolling does the work, and `scroll-snap` supplies the card-to-card
 * feel. That matters more than it sounds — a scripted carousel has to ship, hydrate and
 * run before the first swipe does anything, whereas this one works while the page is
 * still streaming and keeps working if the bundle never arrives.
 *
 * What the classes do, in the order they are written:
 *
 *  - `-mx-6 px-6` bleeds the scroller past the Container's 24px gutter so cards run to
 *    the screen edge, while `scroll-px-6` keeps a snapped card aligned to that gutter
 *    rather than flush against the bezel. `Container` switches to `px-grid-margin` at
 *    `md`, which is exactly where the carousel stops being a carousel.
 *  - Each child is sized to 82% of the viewport, so the next card is always half-visible.
 *    That sliver is the whole affordance: it is what tells a thumb there is more to the
 *    right, and it is why no dots or arrows are needed.
 *  - The scrollbar is hidden on all three engines. On phones it is an overlay that
 *    disappears anyway; leaving it visible only cost the row a few pixels of jitter.
 *  - From `md` everything resets — `md:grid` beats `flex`, the bleed and the snapping
 *    are undone, and the children go back to being grid cells. Any `md:col-span-*` a
 *    caller puts on a child then applies exactly as it did before.
 *
 * Deliberately not focusable and given no `role`: every card in these rows is a link,
 * so tabbing already walks the row and the browser scrolls each card into view as it
 * takes focus. WCAG 2.1.1 is met by that, and adding `tabindex` on top would only put
 * an extra dead stop in the tab order — including on desktop, where there is nothing
 * to scroll at all. The `<ul>`/`<li>` semantics the callers already use are left
 * untouched, so the row is still announced as a list of N items.
 */
export const CardCarousel = ({ className, as: Tag = 'ul', children }: CardCarouselProps) => (
  <Tag
    className={cn(
      // --- phones: a snapping horizontal scroller -------------------------------
      '-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-2',
      '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      '[&>*]:w-[82%] [&>*]:min-w-0 [&>*]:shrink-0 [&>*]:snap-start',
      // Two-up once there is room for it, still scrolling.
      'sm:[&>*]:w-[calc(50%-0.5rem)]',
      // --- md and up: the original grid, untouched ------------------------------
      'md:mx-0 md:grid md:snap-none md:gap-grid-gutter md:overflow-visible md:px-0 md:pb-0',
      'md:[&>*]:w-auto md:[&>*]:shrink',
      className,
    )}
  >
    {children}
  </Tag>
)
