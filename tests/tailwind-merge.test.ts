import { readFileSync } from 'node:fs'

import { cn, FONT_SIZE_KEYS } from '../src/lib/utils.ts'

/**
 * Guards the `cn` helper against tailwind-merge's default class resolution.
 *
 * tailwind-merge classifies `text-<value>` by testing the value against its own
 * built-in font-size scale and treating anything unrecognised as a text colour. Every
 * size in this design system is a custom key, so without the `extendTailwindMerge`
 * config in src/lib/utils.ts a size and a colour land in the same class group and the
 * size is dropped — which rendered every 32px section heading at the inherited 16px.
 *
 * These assertions fail if that configuration is removed or drifts from the config.
 */

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  ok  ${name}`) }
  else { fail++; console.log(`FAIL  ${name}${detail ? '\n      ' + detail : ''}`) }
}

// --- a size and a colour must survive together ---------------------------------
for (const size of FONT_SIZE_KEYS) {
  const result = cn(`font-${size} text-${size}`, 'text-primary')
  check(
    `text-${size} survives alongside text-primary`,
    result.includes(`text-${size}`) && result.includes('text-primary'),
    `got "${result}"`,
  )
}

// --- colours must still collapse against each other ----------------------------
check(
  'two text colours still collapse to the last one',
  cn('text-primary', 'text-white') === 'text-white',
  `got "${cn('text-primary', 'text-white')}"`,
)

// --- two sizes must still collapse ---------------------------------------------
check(
  'two font sizes still collapse to the last one',
  cn('text-body-md', 'text-headline-card') === 'text-headline-card',
  `got "${cn('text-body-md', 'text-headline-card')}"`,
)

// --- the responsive hero override must not clobber the base size ---------------
check(
  'a responsive size override keeps the base size',
  (() => {
    const r = cn('font-display-hero text-display-hero-mobile md:text-[80px]', 'text-white')
    return r.includes('text-display-hero-mobile') && r.includes('md:text-[80px]') && r.includes('text-white')
  })(),
  `got "${cn('font-display-hero text-display-hero-mobile md:text-[80px]', 'text-white')}"`,
)

// --- the declared scale must match tailwind.config.ts --------------------------
const config = readFileSync('tailwind.config.ts', 'utf8')
const fontSizeBlock = config.slice(config.indexOf('fontSize: {'), config.indexOf('boxShadow: {'))
const configured = [...fontSizeBlock.matchAll(/^\s{8}'?([a-z-]+)'?:\s*\[/gm)].map((m) => m[1])

for (const key of configured) {
  check(`"${key}" from tailwind.config.ts is declared in FONT_SIZE_KEYS`,
    (FONT_SIZE_KEYS as readonly string[]).includes(key),
    'add it to FONT_SIZE_KEYS in src/lib/utils.ts')
}
for (const key of FONT_SIZE_KEYS) {
  check(`"${key}" in FONT_SIZE_KEYS still exists in tailwind.config.ts`,
    configured.includes(key),
    'it was removed or renamed in the config')
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
