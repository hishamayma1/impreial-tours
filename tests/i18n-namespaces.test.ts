import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { CLIENT_NAMESPACES } from '../src/i18n/client-namespaces.ts'

/**
 * Guards the narrowed client message payload.
 *
 * Only CLIENT_NAMESPACES reach the browser, so a client component that starts using a
 * namespace not on that list throws at runtime — in the browser, on the page that
 * needs it. This walks the source instead and fails the build first.
 *
 * It also checks the three locales carry identical keys, since a namespace present in
 * en but missing in de is the same class of runtime failure.
 */

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  ok  ${name}`) }
  else { fail++; console.log(`FAIL  ${name}${detail ? '\n      ' + detail : ''}`) }
}

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return full.endsWith('.tsx') || full.endsWith('.ts') ? [full] : []
  })

const sourceFiles = [...walk('src/components'), ...walk('src/hooks'), ...walk('src/app')]

// --- every namespace a client component asks for must be shipped ---------------
const clientFiles = sourceFiles.filter((file) =>
  readFileSync(file, 'utf8').startsWith("'use client'"),
)

const used = new Map<string, string[]>()
for (const file of clientFiles) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/useTranslations\(\s*'([^']+)'/g)) {
    // 'tours.daily' is served by shipping 'tours'.
    const root = match[1].split('.')[0]
    used.set(root, [...(used.get(root) ?? []), file])
  }
}

console.log(`--- ${clientFiles.length} client components, ${used.size} namespaces used ---`)
for (const [namespace, files] of used) {
  check(
    `'${namespace}' is shipped to the client`,
    (CLIENT_NAMESPACES as readonly string[]).includes(namespace),
    `used by ${files[0]} — add it to CLIENT_NAMESPACES`,
  )
}

// --- and nothing is shipped that no client component uses ----------------------
for (const namespace of CLIENT_NAMESPACES) {
  check(`'${namespace}' is still used by a client component`, used.has(namespace),
    'no client component uses it — remove it from CLIENT_NAMESPACES to shrink the payload')
}

// --- locales must agree on their keys -----------------------------------------
const flatten = (value: unknown, prefix = ''): string[] => {
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  )
}

const load = (locale: string) =>
  JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, unknown>

const enKeys = flatten(load('en')).sort()
for (const locale of ['es', 'de']) {
  const keys = flatten(load(locale)).sort()
  const missing = enKeys.filter((key) => !keys.includes(key))
  const extra = keys.filter((key) => !enKeys.includes(key))
  check(`${locale}.json has every en key`, missing.length === 0, `missing: ${missing.slice(0, 5).join(', ')}`)
  check(`${locale}.json has no orphan keys`, extra.length === 0, `extra: ${extra.slice(0, 5).join(', ')}`)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
