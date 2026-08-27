'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

type TypingTextProps = {
  text: string
  className?: string
  /** Milliseconds per character. */
  speed?: number
  /** Milliseconds to wait after arming. Stagger sibling cards with it. */
  startDelay?: number
  as?: 'span' | 'p' | 'h3'
}

/**
 * Types `text` out character by character as it scrolls into view.
 *
 * The ordering here is the whole design, and the first version got it wrong: it blanked
 * the text on mount and refilled it from the observer, so anything that delayed the
 * observer — a throttled `requestAnimationFrame` in a background tab, a missed
 * intersection — left a permanently empty card with a blinking caret on it.
 *
 * So the text is only ever blanked at the moment the animation is about to run:
 *
 *  - Until then the complete string is rendered, which is also what the server sends,
 *    so hydration matches and a visitor with JavaScript off reads a finished sentence.
 *  - The observer arms it while the element is still ~240px BELOW the fold, so the
 *    blank-then-type happens off-screen and never reads as a flicker.
 *  - A safety timer force-completes the text if the animation has not finished in the
 *    time it should have taken. Whatever goes wrong, the copy ends up on screen.
 *
 * Two more things it deliberately does:
 *
 *  - The full string sits in a visually-hidden span, so crawlers and answer engines
 *    index a complete sentence rather than a half-typed one. Destination copy is real
 *    content and animating it must not cost its indexability.
 *  - The animated copy is `aria-hidden`, so screen readers read the static one once,
 *    in full, instead of announcing every keystroke.
 *
 * Timing comes from elapsed time inside `requestAnimationFrame` rather than from
 * `setInterval`, so the speed matches on a 60Hz and a 144Hz display.
 */
export const TypingText = ({
  text,
  className,
  speed = 26,
  startDelay = 0,
  as: Tag = 'span',
}: TypingTextProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  // `armed` false means "render the whole string" — the server's output, and the
  // resting state for reduced motion, no JS, and anything that fails below.
  const [armed, setArmed] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof IntersectionObserver !== 'function') return

    let frame = 0
    let safety: ReturnType<typeof setTimeout> | undefined
    let startedAt = 0
    let cancelled = false

    const tick = (now: number) => {
      if (cancelled) return
      if (!startedAt) startedAt = now

      const elapsed = now - startedAt - startDelay
      if (elapsed >= 0) {
        const next = Math.min(text.length, Math.floor(elapsed / speed))
        setCount(next)
        if (next >= text.length) return
      }
      frame = requestAnimationFrame(tick)
    }

    /**
     * Two observers, because arming and starting want opposite timing.
     *
     * Arming blanks the text, so it has to happen off-screen or it reads as a flicker.
     * Starting wants the opposite — run it too early and the whole animation is over
     * before the section is on screen, which is how the first version behaved: correct,
     * and completely invisible.
     *
     * So: blank it ~320px below the fold, then begin typing once it is genuinely in
     * view.
     */
    const arm = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        arm.disconnect()
        setArmed(true)
        setCount(0)
      },
      { threshold: 0, rootMargin: '0px 0px 320px 0px' },
    )

    const start = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        start.disconnect()
        setArmed(true)
        frame = requestAnimationFrame(tick)

        // Belt and braces: if rAF was throttled or never ran, show the text anyway.
        safety = setTimeout(() => setCount(text.length), startDelay + text.length * speed + 2500)
      },
      { threshold: 0.35 },
    )

    arm.observe(node)
    start.observe(node)

    return () => {
      cancelled = true
      arm.disconnect()
      start.disconnect()
      if (frame) cancelAnimationFrame(frame)
      if (safety) clearTimeout(safety)
    }
  }, [text, speed, startDelay])

  const visible = armed ? text.slice(0, count) : text
  const typing = armed && count < text.length

  return (
    <Tag ref={ref as never} className={cn('relative', className)}>
      <span aria-hidden>
        {visible}
        {typing ? (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.12em] animate-[caret-blink_0.9s_steps(1,end)_infinite] bg-current align-baseline" />
        ) : null}
      </span>
      {/* The complete sentence, for assistive technology and for crawlers. */}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
