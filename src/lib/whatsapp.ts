import type { Locale } from '@/i18n/routing'
import type { QuoteRequestInput } from '@/lib/validation/booking'
import type { LeadInput } from '@/lib/validation/lead'

/**
 * Builds the wa.me deep link that hands a custom-trip enquiry to the sales team.
 *
 * The message is written in the customer's own language so staff can reply in it, and
 * always carries the quote reference so the conversation can be matched back to the
 * CMS record.
 */

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    intro: 'Hello Imperial Tours, I would like a quote for a custom trip.',
    reference: 'Reference', name: 'Name', phone: 'Phone', from: 'From', to: 'To',
    stops: 'Stops', date: 'Date', time: 'Time', passengers: 'Passengers',
    luggage: 'Luggage', vehicle: 'Vehicle', notes: 'Notes',
    leadIntro: 'Hello Imperial Tours, I would like help planning my journey.',
    interest: 'Interested in', travellers: 'Travellers',
  },
  es: {
    intro: 'Hola Imperial Tours, quisiera un presupuesto para un viaje a medida.',
    reference: 'Referencia', name: 'Nombre', phone: 'Teléfono', from: 'Desde', to: 'Hasta',
    stops: 'Paradas', date: 'Fecha', time: 'Hora', passengers: 'Pasajeros',
    luggage: 'Equipaje', vehicle: 'Vehículo', notes: 'Notas',
    leadIntro: 'Hola Imperial Tours, me gustaría ayuda para planificar mi viaje.',
    interest: 'Me interesa', travellers: 'Viajeros',
  },
  de: {
    intro: 'Hallo Imperial Tours, ich hätte gern ein Angebot für eine individuelle Reise.',
    reference: 'Referenz', name: 'Name', phone: 'Telefon', from: 'Von', to: 'Nach',
    stops: 'Zwischenstopps', date: 'Datum', time: 'Uhrzeit', passengers: 'Personen',
    luggage: 'Gepäck', vehicle: 'Fahrzeug', notes: 'Anmerkungen',
    leadIntro: 'Hallo Imperial Tours, ich hätte gern Hilfe bei der Planung meiner Reise.',
    interest: 'Interesse an', travellers: 'Reisende',
  },
}

/**
 * Strips everything but digits. wa.me rejects '+', spaces and punctuation, and a
 * number stored with them is the most common reason the link silently fails.
 */
export const normaliseWhatsappNumber = (raw: string): string => raw.replace(/\D/g, '')

export const buildQuoteMessage = (
  quote: QuoteRequestInput,
  reference: string,
  locale: Locale,
): string => {
  const t = LABELS[locale] ?? LABELS.en
  const lines: string[] = [t.intro, '', `${t.reference}: ${reference}`, `${t.name}: ${quote.name}`]

  const push = (label: string, value?: string | number | null) => {
    if (value === undefined || value === null || value === '') return
    lines.push(`${label}: ${value}`)
  }

  push(t.phone, quote.phone)
  push(t.from, quote.pickupLocation)
  push(t.to, quote.dropoffLocation)
  if (quote.stops.length) push(t.stops, quote.stops.join(' → '))
  push(t.date, quote.date)
  push(t.time, quote.time)
  push(t.passengers, quote.passengers)
  push(t.luggage, quote.luggage)
  push(t.vehicle, quote.vehiclePreference)
  push(t.notes, quote.specialRequests)

  return lines.join('\n')
}

/**
 * The home-page enquiry's version of the same message.
 *
 * Shares `LABELS` with the custom-trip builder so a Spanish enquiry from either form
 * reaches the sales team reading the same way, and carries the same reference so the
 * WhatsApp thread can be matched back to the CMS record.
 */
export const buildLeadMessage = (lead: LeadInput, reference: string, locale: Locale): string => {
  const t = LABELS[locale] ?? LABELS.en
  const lines: string[] = [t.leadIntro, '', `${t.reference}: ${reference}`, `${t.name}: ${lead.name}`]

  const push = (label: string, value?: string | number | null) => {
    if (value === undefined || value === null || value === '') return
    lines.push(`${label}: ${value}`)
  }

  push(t.phone, lead.phone)
  push(t.interest, lead.serviceInterest)
  push(t.date, lead.date)
  push(t.travellers, lead.travellers)
  push(t.notes, lead.message)

  return lines.join('\n')
}

export const buildWhatsappUrl = (whatsappNumber: string, message: string): string | null => {
  const number = normaliseWhatsappNumber(whatsappNumber)
  // Without a configured number there is no link to give — the caller falls back to
  // the on-page success state alone.
  if (!number) return null

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
