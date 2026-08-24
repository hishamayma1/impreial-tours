import {
  buildQuoteMessage,
  buildWhatsappUrl,
  normaliseWhatsappNumber,
} from '../src/lib/whatsapp.ts'
import type { QuoteRequestInput } from '../src/lib/validation/booking.ts'

let pass = 0, fail = 0
const check = (name: string, condition: boolean, detail = '') => {
  if (condition) { pass++; console.log(`  ok  ${name}`) }
  else { fail++; console.log(`FAIL  ${name} ${detail}`) }
}

const quote: QuoteRequestInput = {
  name: 'Ada Lovelace', phone: '+20 100 555 0000', email: 'ada@example.com',
  pickupLocation: 'Cairo Airport', dropoffLocation: 'Mena House',
  stops: ['Saqqara', 'Dahshur'], date: '2026-04-02', time: '09:30',
  passengers: 3, luggage: 4, vehiclePreference: 'Minivan',
  specialRequests: 'Child seat please', preferredLanguage: 'en', captchaToken: '',
}

// --- number normalisation: wa.me rejects +, spaces and punctuation
check('strips + and spaces', normaliseWhatsappNumber('+20 100 555 0000') === '201005550000')
check('strips dashes/parens', normaliseWhatsappNumber('(20)-100-555') === '20100555')
check('empty stays empty', normaliseWhatsappNumber('') === '')

// --- message content
const en = buildQuoteMessage(quote, 'QR-ABC123', 'en')
check('includes reference', en.includes('QR-ABC123'))
check('includes name', en.includes('Ada Lovelace'))
check('joins stops with arrows', en.includes('Saqqara → Dahshur'))
check('omits nothing set', !en.includes('undefined') && !en.includes('null'))

// --- localisation: the customer's language, so staff reply in it
const de = buildQuoteMessage(quote, 'QR-ABC123', 'de')
check('german intro', de.startsWith('Hallo Imperial Tours'), de.slice(0, 40))
check('german labels', de.includes('Personen: 3') && de.includes('Von: Cairo Airport'))

const es = buildQuoteMessage(quote, 'QR-ABC123', 'es')
check('spanish intro', es.startsWith('Hola Imperial Tours'), es.slice(0, 40))

// --- empty optional fields are dropped, not printed blank
const sparse = buildQuoteMessage(
  { ...quote, dropoffLocation: '', stops: [], time: '', vehiclePreference: '', specialRequests: '' },
  'QR-1', 'en',
)
check('drops empty optionals', !sparse.includes('To:') && !sparse.includes('Notes:'))
check('keeps required', sparse.includes('From: Cairo Airport'))

// --- url building
const url = buildWhatsappUrl('+20 100 555 0000', 'hello world')
check('url uses digits only', url === 'https://wa.me/201005550000?text=hello%20world', String(url))
check('no number -> null', buildWhatsappUrl('', 'x') === null)
check('punctuation-only number -> null', buildWhatsappUrl('+++', 'x') === null)

const encoded = buildWhatsappUrl('201005550000', en)
check('newlines encoded', Boolean(encoded?.includes('%0A')))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
