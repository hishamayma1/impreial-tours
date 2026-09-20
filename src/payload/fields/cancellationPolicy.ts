import type { Field } from 'payload'

/**
 * Shared by Tours, Hotels, Transfers and Bicycles.
 *
 * Left blank, the detail page shows the standard company-wide cancellation policy
 * (`CancellationPolicy` in components/shared) — the same text on every listing, with
 * nothing to maintain per document. Filled in here, that document's own terms replace
 * it. There is deliberately no default value stored on the field itself: a hard-coded
 * default here would have to be edited on every document individually the day the
 * standard policy changes, which defeats the point of a shared default.
 */
export const cancellationPolicyField: Field = {
  name: 'cancellationPolicy',
  type: 'richText',
  localized: true,
  admin: {
    description:
      'Leave blank to use the standard company-wide cancellation policy. Fill in only to override it for this listing.',
  },
}
