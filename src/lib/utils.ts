import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The design system's type scale, as it is keyed in tailwind.config.ts.
 *
 * tailwind-merge has to be told about these. Out of the box it decides what
 * `text-<value>` means by testing the value against its own built-in font-size scale
 * (`sm`, `lg`, `2xl`, arbitrary lengths…); anything it does not recognise it files as
 * a text *colour*. So `text-headline-section` and `text-primary` looked like two
 * colours competing for one slot, and the later class silently won:
 *
 *   cn('font-headline-section text-headline-section', 'text-primary')
 *     -> 'font-headline-section text-primary'    // 32px heading rendered at 16px
 *
 * That hit every SectionHeading on the site. Declaring the scale here puts these
 * classes in the font-size group, where they no longer collide with colours.
 *
 * Keep in sync with `theme.extend.fontSize` — tests/tailwind-merge.test.ts fails if
 * the two drift apart.
 */
export const FONT_SIZE_KEYS = [
  'display-hero',
  'display-hero-mobile',
  'headline-section',
  'headline-card',
  'body-lg',
  'body-md',
  'label-caps',
  'caption',
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZE_KEYS] }],
      'font-family': [{ font: [...FONT_SIZE_KEYS] }],
    },
  },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/** Returns the first non-empty string, so CMS copy can override an i18n default. */
export const firstFilled = (...values: Array<string | null | undefined>): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return ''
}
