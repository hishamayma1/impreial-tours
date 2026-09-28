import { getPayload } from 'payload'
import config from '../../payload.config'

import { locales, defaultLocale, type Locale } from '../../i18n/routing'
import { revalidateRemote } from './revalidate-remote'

/**
 * Eight demo client testimonials, for filling and checking the home page carousel.
 *
 *   npm run demo:testimonials                                  create (or refresh) them as drafts
 *   npx cross-env DEMO_PUBLISH=1 npm run demo:testimonials     create (or refresh) them published
 *   npx cross-env DEMO_CLEAR=1 npm run demo:testimonials       remove exactly what this script created
 *
 * Options are environment variables, not flags: `payload run` drops every argument
 * after the script path, so a `--publish` never reaches `process.argv`.
 *
 * Drafts by default, on purpose. These are invented quotes from invented people, and
 * the database this project points at may well be the one the live site reads: a
 * published demo review there is shown to real visitors as a real client's words.
 * As drafts they sit in the dashboard (Content → Testimonials) ready to be checked,
 * edited into real feedback or published deliberately. `DEMO_PUBLISH=1` is for a local
 * or staging database where showing them is the point.
 *
 * Every entry is tagged in the dashboard by its author name ending in "(demo)" so it
 * can never be mistaken for real feedback in the admin list. Idempotent: entries are
 * matched on author name and updated in place, and `DEMO_CLEAR=1` deletes by the same
 * names and touches nothing else.
 *
 * No portraits: the carousel falls back to the author's initial, and borrowing a
 * stock photograph for an invented person would make the invention look real.
 */

type Translated<T> = Record<Locale, T>

type DemoTestimonial = {
  author: string
  rating: 4 | 5
  quote: Translated<string>
  location: Translated<string>
}

const demoTestimonials: DemoTestimonial[] = [
  {
    author: 'Sofia Marchetti (demo)',
    rating: 5,
    quote: {
      en: 'Our guide made the Valley of the Kings feel like a story rather than a tour. Every transfer was on time and every hotel was better than we expected.',
      es: 'Nuestro guía convirtió el Valle de los Reyes en una historia y no en una visita. Cada traslado fue puntual y cada hotel superó lo que esperábamos.',
      de: 'Unser Guide hat das Tal der Könige zu einer Geschichte gemacht, nicht zu einer Führung. Jeder Transfer war pünktlich, jedes Hotel besser als erwartet.',
    },
    location: { en: 'Milan, Italy', es: 'Milán, Italia', de: 'Mailand, Italien' },
  },
  {
    author: 'Daniel & Hannah Kerr (demo)',
    rating: 5,
    quote: {
      en: 'We planned our honeymoon around a Nile cruise and it was the highlight of the trip. The team answered every question within hours, even on the weekend.',
      es: 'Planeamos nuestra luna de miel en torno a un crucero por el Nilo y fue lo mejor del viaje. El equipo respondió cada pregunta en horas, incluso en fin de semana.',
      de: 'Wir haben unsere Hochzeitsreise um eine Nilkreuzfahrt geplant, und sie war der Höhepunkt. Das Team hat jede Frage innerhalb von Stunden beantwortet, sogar am Wochenende.',
    },
    location: { en: 'Edinburgh, UK', es: 'Edimburgo, Reino Unido', de: 'Edinburgh, Großbritannien' },
  },
  {
    author: 'Amira Haddad (demo)',
    rating: 5,
    quote: {
      en: 'Travelling with my parents meant everything had to be easy. Private transfers, step-free hotels and a guide who never rushed us — it was exactly right.',
      es: 'Viajar con mis padres significaba que todo tenía que ser fácil. Traslados privados, hoteles accesibles y un guía que nunca nos apuró: fue perfecto.',
      de: 'Mit meinen Eltern zu reisen hieß, dass alles einfach sein musste. Private Transfers, barrierefreie Hotels und ein Guide, der uns nie gehetzt hat — genau richtig.',
    },
    location: { en: 'Amman, Jordan', es: 'Amán, Jordania', de: 'Amman, Jordanien' },
  },
  {
    author: 'Lukas Brandt (demo)',
    rating: 4,
    quote: {
      en: 'The White Desert camping night was unforgettable. One long drive felt tight on time, but the team adjusted the next day without being asked.',
      es: 'La noche de acampada en el Desierto Blanco fue inolvidable. Un trayecto largo fue algo justo de tiempo, pero el equipo lo ajustó al día siguiente sin que lo pidiéramos.',
      de: 'Die Nacht im Camp in der Weißen Wüste war unvergesslich. Eine lange Fahrt war zeitlich knapp, aber das Team hat den nächsten Tag unaufgefordert angepasst.',
    },
    location: { en: 'Munich, Germany', es: 'Múnich, Alemania', de: 'München, Deutschland' },
  },
  {
    author: 'Chen Wei (demo)',
    rating: 5,
    quote: {
      en: 'Seeing the Pyramids at sunrise before the crowds arrived was worth the early start. Booking was simple and the price was exactly what we were quoted.',
      es: 'Ver las pirámides al amanecer antes de que llegaran las multitudes valió el madrugón. La reserva fue sencilla y el precio fue exactamente el presupuestado.',
      de: 'Die Pyramiden bei Sonnenaufgang vor den Menschenmassen zu sehen, war das frühe Aufstehen wert. Die Buchung war einfach, der Preis genau wie angeboten.',
    },
    location: { en: 'Singapore', es: 'Singapur', de: 'Singapur' },
  },
  {
    author: 'María José Ortega (demo)',
    rating: 5,
    quote: {
      en: 'They built a ten-day itinerary around our interests in history and food. Every restaurant recommendation was a hit, and Aswan was pure magic.',
      es: 'Crearon un itinerario de diez días según nuestro interés por la historia y la gastronomía. Todas las recomendaciones de restaurantes acertaron, y Asuán fue pura magia.',
      de: 'Sie haben eine zehntägige Route nach unseren Interessen für Geschichte und Essen gebaut. Jede Restaurantempfehlung war ein Treffer, und Assuan war pure Magie.',
    },
    location: { en: 'Seville, Spain', es: 'Sevilla, España', de: 'Sevilla, Spanien' },
  },
  {
    author: 'James Okafor (demo)',
    rating: 4,
    quote: {
      en: 'A smooth first trip to Egypt with two teenagers. The felucca sail in Luxor won them over completely — I would book with this team again.',
      es: 'Un primer viaje a Egipto sin complicaciones con dos adolescentes. El paseo en faluca en Luxor los conquistó por completo: volvería a reservar con este equipo.',
      de: 'Eine reibungslose erste Ägyptenreise mit zwei Teenagern. Die Feluken-Fahrt in Luxor hat sie völlig begeistert — ich würde wieder bei diesem Team buchen.',
    },
    location: { en: 'Toronto, Canada', es: 'Toronto, Canadá', de: 'Toronto, Kanada' },
  },
  {
    author: 'Claire Dubois (demo)',
    rating: 5,
    quote: {
      en: 'From the airport pickup to the last dinner in Cairo, everything was handled with care. It felt like travelling with friends who happen to know Egypt inside out.',
      es: 'Desde la recogida en el aeropuerto hasta la última cena en El Cairo, todo se cuidó al detalle. Fue como viajar con amigos que conocen Egipto a fondo.',
      de: 'Von der Abholung am Flughafen bis zum letzten Abendessen in Kairo wurde alles mit Sorgfalt erledigt. Es war, als reise man mit Freunden, die Ägypten in- und auswendig kennen.',
    },
    location: { en: 'Lyon, France', es: 'Lyon, Francia', de: 'Lyon, Frankreich' },
  },
]

const AUTHORS = demoTestimonials.map((entry) => entry.author)
const otherLocales = locales.filter((locale) => locale !== defaultLocale)

const run = async () => {
  console.log('[demo:testimonials] connecting…')
  const payload = await getPayload({ config })
  const clear = process.env.DEMO_CLEAR === '1'
  const publish = process.env.DEMO_PUBLISH === '1'
  const status = publish ? 'published' : 'draft'

  const { docs: existing } = await payload.find({
    collection: 'testimonials',
    where: { author: { in: AUTHORS } },
    limit: 100,
    pagination: false,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  // --- clear ---------------------------------------------------------------
  if (clear) {
    for (const doc of existing) {
      await payload.delete({ collection: 'testimonials', id: doc.id, overrideAccess: true })
      console.log(`removed ${(doc as { author?: string }).author ?? doc.id}`)
    }
    console.log(`--- removed ${existing.length} demo testimonial(s) ---`)
    await revalidateRemote(['testimonials'], (message) => console.log(message))
    process.exit(0)
  }

  // --- write ---------------------------------------------------------------
  const idByAuthor = new Map(
    existing.map((doc) => [String((doc as { author?: string }).author), String(doc.id)]),
  )

  let created = 0
  let updated = 0
  const failed: string[] = []

  for (const [index, entry] of demoTestimonials.entries()) {
    const existingId = idByAuthor.get(entry.author)
    const base = {
      author: entry.author,
      rating: entry.rating,
      // After any real testimonials, which keep their own (lower) order numbers.
      order: 100 + index,
      _status: status,
    }

    try {
      const doc = existingId
        ? await payload.update({
            collection: 'testimonials',
            id: existingId,
            locale: defaultLocale,
            data: { ...base, quote: entry.quote[defaultLocale], location: entry.location[defaultLocale] } as never,
            draft: !publish,
            overrideAccess: true,
          })
        : await payload.create({
            collection: 'testimonials',
            locale: defaultLocale,
            data: { ...base, quote: entry.quote[defaultLocale], location: entry.location[defaultLocale] } as never,
            draft: !publish,
            overrideAccess: true,
          })

      for (const locale of otherLocales) {
        await payload.update({
          collection: 'testimonials',
          id: doc.id,
          locale,
          data: { quote: entry.quote[locale], location: entry.location[locale], _status: status } as never,
          draft: !publish,
          overrideAccess: true,
        })
      }

      if (existingId) updated += 1
      else created += 1
      console.log(`${existingId ? 'updated' : 'created'} ${entry.author} (${status})`)
    } catch (error) {
      const detail = error as { message?: string }
      failed.push(`${entry.author}: ${detail.message ?? 'unknown error'}`)
    }
  }

  console.log(`--- ${created} created, ${updated} updated, ${failed.length} failed (${status}) ---`)
  for (const line of failed) console.error(line)

  await revalidateRemote(['testimonials'], (message) => console.log(message))
  process.exit(failed.length ? 1 : 0)
}

await run().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
