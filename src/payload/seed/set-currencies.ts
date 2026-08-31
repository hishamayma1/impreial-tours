import payload from 'payload'
import config from '@payload-config'

/**
 * Reduces the currency switcher to the two currencies the business trades in.
 *
 * The `currencies` array previously held USD, EUR, GBP and EGP, and `code` was free
 * text. Now that the field is a select of USD and EGP, the two extra rows are not just
 * unwanted — they are invalid, and Payload rejects *any* save of Site Settings while
 * they are present. So this has to run alongside the schema change rather than being
 * left to a human to tidy up in the admin.
 *
 * Existing rates are preserved rather than reasserted: an exchange rate is the
 * operator's commercial decision and this script has no business inventing one. Only
 * if a currency is missing entirely does it fall back to a sensible starting value.
 *
 *   npm run currencies:set
 */

type Doc = Record<string, any>

/** USD first: it is the base every price is authored in, and row one is the default. */
const KEEP = [
  { code: 'USD', symbol: '$', fallbackRate: 1 },
  { code: 'EGP', symbol: 'E£', fallbackRate: 48.5 },
]

const run = async () => {
  const p = await payload.init({ config })

  const settings = (await p.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })) as Doc

  const existing = (settings.currencies ?? []) as Doc[]
  const dropped = existing
    .map((row) => String(row.code))
    .filter((code) => !KEEP.some((keep) => keep.code === code))

  const currencies = KEEP.map((keep) => {
    const match = existing.find((row) => String(row.code) === keep.code)
    const rate = typeof match?.rate === 'number' && match.rate > 0 ? match.rate : keep.fallbackRate

    return {
      // Reuse the row id so the array is edited rather than replaced wholesale.
      id: match?.id,
      code: keep.code,
      symbol: String(match?.symbol || keep.symbol),
      // USD is the base by definition; a rate other than 1 on it would scale the
      // entire price list against itself.
      rate: keep.code === 'USD' ? 1 : rate,
    }
  })

  await p.updateGlobal({
    slug: 'site-settings',
    overrideAccess: true,
    data: { currencies } as never,
  })

  if (dropped.length) p.logger.info(`Removed ${dropped.join(', ')}`)
  p.logger.info(
    `Currencies: ${currencies.map((c) => `${c.code} @ ${c.rate}`).join(', ')}`,
  )
  process.exit(0)
}

await run()
