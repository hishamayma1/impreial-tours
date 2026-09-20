import type { ReactNode } from 'react'

import { RichText } from '@/components/ui/RichText'

type PolicySection = { title: string; body: ReactNode }

const list = (items: string[]) => (
  <ul className="mt-2 space-y-1.5">
    {items.map((item) => (
      <li key={item} className="flex gap-2 font-body-md text-body-md text-on-surface-variant">
        <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-on-surface-variant/50" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

const p = (children: ReactNode) => (
  <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{children}</p>
)

/**
 * The company-wide default, used whenever a document has no `cancellationPolicy`
 * override of its own. Editing it here changes every tour, hotel, transfer and
 * bicycle that hasn't been given its own terms — that shared-by-default behavior is
 * the whole point (see fields/cancellationPolicy.ts), so resist the urge to fork a
 * copy per collection.
 */
const DEFAULT_SECTIONS: PolicySection[] = [
  {
    title: '1. Cancellation',
    body: (
      <>
        {p('Cancellation requests must be submitted through our official email, WhatsApp, or other official contact channels.')}
        {p('The applicable cancellation terms may vary depending on the tour, hotel, transfer, activity, or other service booked.')}
        {p('If your booking confirmation includes specific cancellation terms, those terms will apply.')}
      </>
    ),
  },
  {
    title: '2. Day Tours & Excursions',
    body: (
      <>
        {p('For bookings where no specific cancellation policy is stated:')}
        {list([
          '48 hours or more before the tour: A refund may be available, subject to any non-refundable costs or applicable fees.',
          'Less than 48 hours: The booking may be partially or fully non-refundable.',
          'No-show: Bookings may be non-refundable if the customer does not attend or cancels without prior notice.',
        ])}
      </>
    ),
  },
  {
    title: '3. Hotels & Travel Packages',
    body: (
      <>
        {p('Hotel bookings, full packages, and customized trips are subject to the cancellation policies of the relevant hotel or service provider.')}
        {p('Some special offers and prepaid services may be non-refundable.')}
      </>
    ),
  },
  {
    title: '4. Changes to Bookings',
    body: (
      <>
        {p('We will do our best to accommodate requests to change travel dates, the number of travelers, or other booking details.')}
        {p('Changes are subject to availability and may involve additional charges.')}
      </>
    ),
  },
  {
    title: '5. Cancellation by Imperial Tours',
    body: (
      <>
        {p('If we need to cancel a confirmed service, we will offer an alternative arrangement or refund where applicable.')}
        {p('For circumstances beyond our reasonable control, such as severe weather, government restrictions, natural disasters, or transportation disruptions, we will work with you to find the best available solution, subject to third-party terms.')}
      </>
    ),
  },
  {
    title: '6. Refunds',
    body: (
      <>
        {p('Approved refunds will normally be processed through the original payment method.')}
        {p('We aim to process refunds within 7–14 business days. The time required for the refund to appear in your account may vary depending on your bank or payment provider.')}
        {p('Applicable bank, payment gateway, or supplier fees may be deducted where permitted.')}
      </>
    ),
  },
  {
    title: '7. Travel Insurance',
    body: p(
      'We recommend purchasing travel insurance that covers cancellation, medical emergencies, and other unexpected travel situations.',
    ),
  },
]

const CancellationPolicyDefault = () => (
  <div className="space-y-6">
    {DEFAULT_SECTIONS.map((section) => (
      <div key={section.title}>
        <h3 className="font-headline-card text-headline-card text-primary">{section.title}</h3>
        {section.body}
      </div>
    ))}
  </div>
)

/**
 * Renders a document's own `cancellationPolicy` richText when it has one, otherwise
 * the standard policy above. This is the only place that decision is made — every
 * detail page just passes its document's field through unchanged.
 */
export const CancellationPolicy = ({ override }: { override?: unknown }) =>
  override ? <RichText data={override} /> : <CancellationPolicyDefault />
