'use client'

import { useEffect, useState } from 'react'

/**
 * Mount/unmount timing for a panel that animates both in and out.
 *
 * Rendering a popover as `{open ? <Panel /> : null}` gives it no exit: it is gone the
 * frame `open` turns false, and its entry is a hard cut too, because the element is
 * born already in its final state with nothing for a CSS transition to start from.
 *
 * `mounted` keeps the element in the DOM for `duration` ms after closing, so it can
 * transition out. `shown` flips one frame after mounting, so the element is first
 * painted in its hidden state and the browser has a starting point to transition in
 * from. Drive the classes from `shown` and the rendering from `mounted`.
 */
export const usePresence = (open: boolean, duration = 200) => {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      // Two frames: the first commits the element in its hidden state, the second
      // changes it — one frame is not always enough for the hidden state to paint.
      let inner = 0
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => setShown(true))
      })
      return () => {
        window.cancelAnimationFrame(outer)
        window.cancelAnimationFrame(inner)
      }
    }

    setShown(false)
    const timer = window.setTimeout(() => setMounted(false), duration)
    return () => window.clearTimeout(timer)
  }, [open, duration])

  return { mounted, shown }
}
