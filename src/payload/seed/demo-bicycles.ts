import { getPayload } from 'payload'
import config from '../../payload.config'

import { locales, defaultLocale, type Locale } from '../../i18n/routing'
import { revalidateRemote } from './revalidate-remote'

/**
 * A demo fleet for the bicycles listing and the rental planner.
 *
 *   npm run demo:bicycles            create (or refresh) the demo fleet
 *   npm run demo:bicycles -- --clear remove exactly what it created
 *
 * The point of it is coverage, not volume. The listing has six categories, a price
 * range, an e-bike facet, frame sizes and a "how long for" window; the planner has
 * three pricing modes, half-hour steps, overtime rates, weekend surcharges and
 * delivery. A fleet that is all city bikes at one rate exercises none of that, and the
 * first time any of it is seen is in production.
 *
 * So every bike below is deliberately different from the others in some way that a
 * control on the page can find: one is packages-only, one is hourly-only, one bills in
 * half hours, one is nearly sold out, one is expensive enough to sit alone at the top
 * of a price sort. Two guided rides are included so the listing's type tabs have
 * something on both sides.
 *
 * Idempotent: bikes are matched by slug and updated in place, so re-running refreshes
 * rather than duplicating. `--clear` deletes by the same slugs and touches nothing
 * else — bicycles created by `npm run seed` or by hand are never in scope.
 */

type Translated<T> = Record<Locale, T>

type Band = {
  hours: number
  price: number
  popular?: boolean
  labels: Translated<string>
  notes?: Translated<string>
}

type DemoBike = {
  slug: string
  bikeType: 'rental' | 'tour'
  category: 'city' | 'electric' | 'mountain' | 'road' | 'touring' | 'kids'
  /** Which seeded asset to reuse as the hero. Falls back to any media on the record. */
  asset: string
  rental?: {
    electric: boolean
    gears: number
    weightKg: number
    frameSizes: string[]
    deposit: number
    inventory: number
    pricingMode: 'both' | 'bands' | 'hourly'
    hourlyRate?: number
    extraHourRate?: number
    minHours: number
    maxHours: number
    hourStep: number
    bands: Band[]
    pickupSlots: string[]
    deliveryFee?: number
    weekendSurchargePct?: number
    accessories: Translated<string[]>
  }
  ride?: {
    distanceKm: number
    elevationGainM: number
    difficulty: 'easy' | 'moderate' | 'hard'
    durationHours: number
    pricePerPerson: number
    minAge: number
    maxGroupSize: number
    startTimes: string[]
    stops: Translated<Array<{ stopName: string; stopDescription: string }>>
  }
  copy: Translated<{
    title: string
    description: string
    bikeModel?: string
    routeName?: string
  }>
}

/** Package labels repeat across the fleet; the prices do not. */
const HOUR: Translated<string> = { en: '1 hour', es: '1 hora', de: '1 Stunde' }
const THREE: Translated<string> = { en: '3 hours', es: '3 horas', de: '3 Stunden' }
const HALF: Translated<string> = { en: 'Half day', es: 'Medio día', de: 'Halber Tag' }
const FULL: Translated<string> = { en: 'Full day', es: 'Día completo', de: 'Ganzer Tag' }
const WEEKEND: Translated<string> = { en: 'Weekend', es: 'Fin de semana', de: 'Wochenende' }
const WEEK: Translated<string> = { en: 'One week', es: 'Una semana', de: 'Eine Woche' }

const BEST_VALUE: Translated<string> = {
  en: 'Best value',
  es: 'Mejor precio',
  de: 'Bester Wert',
}

const KIT = {
  standard: {
    en: ['Helmet', 'Lock', 'Front and rear lights', 'Route map', 'Puncture repair kit'],
    es: ['Casco', 'Candado', 'Luces delantera y trasera', 'Mapa de ruta', 'Kit antipinchazos'],
    de: ['Helm', 'Schloss', 'Front- und Rücklicht', 'Streckenkarte', 'Flickzeug'],
  } as Translated<string[]>,
  electric: {
    en: ['Helmet', 'Lock', 'Lights', 'Spare battery', 'Charger', 'Phone mount'],
    es: ['Casco', 'Candado', 'Luces', 'Batería de repuesto', 'Cargador', 'Soporte para móvil'],
    de: ['Helm', 'Schloss', 'Beleuchtung', 'Ersatzakku', 'Ladegerät', 'Handyhalterung'],
  } as Translated<string[]>,
  family: {
    en: ['Child helmet', 'Training wheels on request', 'Lock', 'Bell'],
    es: ['Casco infantil', 'Ruedines a petición', 'Candado', 'Timbre'],
    de: ['Kinderhelm', 'Stützräder auf Wunsch', 'Schloss', 'Klingel'],
  } as Translated<string[]>,
}

export const demoBicycles: DemoBike[] = [
  // --- 1. The workhorse: hourly and packages, the default shape ---------------
  {
    slug: 'demo-corniche-city-cruiser',
    bikeType: 'rental',
    category: 'city',
    asset: 'destLuxor',
    rental: {
      electric: false,
      gears: 7,
      weightKg: 14,
      frameSizes: ['S', 'M', 'L'],
      deposit: 50,
      inventory: 12,
      pricingMode: 'both',
      hourlyRate: 6,
      extraHourRate: 4,
      minHours: 1,
      maxHours: 168,
      hourStep: 1,
      bands: [
        { hours: 3, price: 15, labels: THREE },
        { hours: 6, price: 22, labels: HALF, popular: true, notes: BEST_VALUE },
        { hours: 12, price: 32, labels: FULL },
        { hours: 168, price: 140, labels: WEEK },
      ],
      pickupSlots: ['07:00', '09:00', '11:00', '14:00', '16:00'],
      deliveryFee: 12,
      weekendSurchargePct: 10,
      accessories: KIT.standard,
    },
    copy: {
      en: {
        title: 'Corniche City Cruiser',
        description:
          'A comfortable seven-speed for the corniche and the west bank lanes. Upright, forgiving, and steady on the cobbles.',
        bikeModel: 'Cairo Cruiser 7',
      },
      es: {
        title: 'Bicicleta urbana Corniche',
        description:
          'Una cómoda bicicleta de siete velocidades para la corniche y los caminos de la orilla oeste. Postura erguida, indulgente y estable sobre los adoquines.',
        bikeModel: 'Cairo Cruiser 7',
      },
      de: {
        title: 'Corniche City-Cruiser',
        description:
          'Ein bequemes Sieben-Gang-Rad für die Corniche und die Wege am Westufer. Aufrecht, gutmütig und ruhig auf dem Kopfsteinpflaster.',
        bikeModel: 'Cairo Cruiser 7',
      },
    },
  },

  // --- 2. Premium e-bike: expensive, scarce, packages-heavy -------------------
  {
    slug: 'demo-nubia-electric-trail',
    bikeType: 'rental',
    category: 'electric',
    asset: 'destAswan',
    rental: {
      electric: true,
      gears: 9,
      weightKg: 22,
      frameSizes: ['M', 'L'],
      deposit: 150,
      inventory: 3,
      pricingMode: 'both',
      hourlyRate: 14,
      extraHourRate: 9,
      minHours: 2,
      maxHours: 72,
      hourStep: 1,
      bands: [
        { hours: 4, price: 45, labels: { en: '4 hours', es: '4 horas', de: '4 Stunden' } },
        { hours: 8, price: 68, labels: HALF, popular: true, notes: BEST_VALUE },
        { hours: 24, price: 110, labels: FULL },
      ],
      pickupSlots: ['08:00', '10:00', '13:00'],
      deliveryFee: 20,
      weekendSurchargePct: 15,
      accessories: KIT.electric,
    },
    copy: {
      en: {
        title: 'Nubia Electric Trail',
        description:
          'Pedal assist for the desert tracks behind Aswan, with range for a full day and a spare battery in the pannier.',
        bikeModel: 'Nubia E-Trail 9',
      },
      es: {
        title: 'Nubia eléctrica de montaña',
        description:
          'Pedaleo asistido para las pistas del desierto tras Asuán, con autonomía para todo el día y batería de repuesto en la alforja.',
        bikeModel: 'Nubia E-Trail 9',
      },
      de: {
        title: 'Nubia Elektro-Trail',
        description:
          'Tretunterstützung für die Wüstenpisten hinter Assuan, mit Reichweite für einen ganzen Tag und Ersatzakku in der Packtasche.',
        bikeModel: 'Nubia E-Trail 9',
      },
    },
  },

  // --- 3. Packages only: no hourly rate, so the planner hides its slider ------
  {
    slug: 'demo-valley-mountain-bike',
    bikeType: 'rental',
    category: 'mountain',
    asset: 'destLuxor',
    rental: {
      electric: false,
      gears: 21,
      weightKg: 13,
      frameSizes: ['S', 'M', 'L', 'XL'],
      deposit: 80,
      inventory: 8,
      pricingMode: 'bands',
      minHours: 6,
      maxHours: 72,
      hourStep: 1,
      bands: [
        { hours: 6, price: 26, labels: HALF },
        { hours: 12, price: 38, labels: FULL, popular: true, notes: BEST_VALUE },
        { hours: 48, price: 70, labels: WEEKEND },
      ],
      pickupSlots: ['06:30', '08:00', '15:00'],
      weekendSurchargePct: 10,
      accessories: KIT.standard,
    },
    copy: {
      en: {
        title: 'Valley Trail Mountain Bike',
        description:
          'Twenty-one gears and proper tyres for the tracks above the Valley of the Kings. Sold by the half day upwards — this one is not an hourly bike.',
        bikeModel: 'Theban Trail 21',
      },
      es: {
        title: 'Bicicleta de montaña Valle',
        description:
          'Veintiuna velocidades y neumáticos serios para las pistas sobre el Valle de los Reyes. Se alquila desde medio día: esta no es una bicicleta por horas.',
        bikeModel: 'Theban Trail 21',
      },
      de: {
        title: 'Valley-Trail Mountainbike',
        description:
          'Einundzwanzig Gänge und richtige Reifen für die Pisten über dem Tal der Könige. Ab einem halben Tag buchbar — kein Stundenrad.',
        bikeModel: 'Theban Trail 21',
      },
    },
  },

  // --- 4. Hourly only, in half hours: the short-hop bike ---------------------
  {
    slug: 'demo-island-hopper',
    bikeType: 'rental',
    category: 'city',
    asset: 'destCairo',
    rental: {
      electric: false,
      gears: 3,
      weightKg: 15,
      frameSizes: ['S', 'M'],
      deposit: 30,
      inventory: 20,
      pricingMode: 'hourly',
      hourlyRate: 4,
      minHours: 0.5,
      maxHours: 8,
      hourStep: 0.5,
      bands: [],
      pickupSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      accessories: KIT.standard,
    },
    copy: {
      en: {
        title: 'Island Hopper',
        description:
          'A light three-speed for an hour on Gezira or a run along the river. Billed in half hours, from thirty minutes up.',
        bikeModel: 'Gezira Light 3',
      },
      es: {
        title: 'Island Hopper',
        description:
          'Una ligera de tres velocidades para una hora en Gezira o un paseo junto al río. Se factura en medias horas, desde treinta minutos.',
        bikeModel: 'Gezira Light 3',
      },
      de: {
        title: 'Island Hopper',
        description:
          'Ein leichtes Drei-Gang-Rad für eine Stunde auf Gezira oder eine Runde am Fluss. Abrechnung im Halbstundentakt, ab dreißig Minuten.',
        bikeModel: 'Gezira Light 3',
      },
    },
  },

  // --- 5. Road bike: long hires, weekly rate, the top of a price sort --------
  {
    slug: 'demo-delta-road-bike',
    bikeType: 'rental',
    category: 'road',
    asset: 'destCairo',
    rental: {
      electric: false,
      gears: 22,
      weightKg: 8,
      frameSizes: ['XS', 'S', 'M', 'L'],
      deposit: 250,
      inventory: 4,
      pricingMode: 'both',
      hourlyRate: 12,
      extraHourRate: 7,
      minHours: 4,
      maxHours: 336,
      hourStep: 1,
      bands: [
        { hours: 12, price: 55, labels: FULL },
        { hours: 48, price: 120, labels: WEEKEND, popular: true, notes: BEST_VALUE },
        { hours: 168, price: 320, labels: WEEK },
      ],
      pickupSlots: ['06:00', '07:00', '16:00'],
      deliveryFee: 25,
      accessories: KIT.standard,
    },
    copy: {
      en: {
        title: 'Delta Road Bike',
        description:
          'A carbon frame and twenty-two gears for the flat roads north of the city. Taken by the day or the week rather than the hour.',
        bikeModel: 'Delta Carbon 22',
      },
      es: {
        title: 'Bicicleta de carretera Delta',
        description:
          'Cuadro de carbono y veintidós velocidades para las carreteras llanas al norte de la ciudad. Se alquila por días o semanas más que por horas.',
        bikeModel: 'Delta Carbon 22',
      },
      de: {
        title: 'Delta Rennrad',
        description:
          'Carbonrahmen und zweiundzwanzig Gänge für die flachen Straßen nördlich der Stadt. Eher tage- oder wochenweise als stundenweise.',
        bikeModel: 'Delta Carbon 22',
      },
    },
  },

  // --- 6. Touring: the long-haul option, cheapest by the week ----------------
  {
    slug: 'demo-nile-touring-bike',
    bikeType: 'rental',
    category: 'touring',
    asset: 'destAswan',
    rental: {
      electric: false,
      gears: 18,
      weightKg: 16,
      frameSizes: ['M', 'L', 'XL'],
      deposit: 120,
      inventory: 6,
      pricingMode: 'both',
      hourlyRate: 8,
      extraHourRate: 5,
      minHours: 6,
      maxHours: 336,
      hourStep: 1,
      bands: [
        { hours: 12, price: 34, labels: FULL },
        { hours: 168, price: 165, labels: WEEK, popular: true, notes: BEST_VALUE },
      ],
      pickupSlots: ['07:00', '08:30'],
      deliveryFee: 15,
      accessories: KIT.standard,
    },
    copy: {
      en: {
        title: 'Nile Touring Bike',
        description:
          'Racks front and rear, eighteen gears and a saddle you can sit on all week. Built for riding between towns, not around one.',
        bikeModel: 'Nile Tourer 18',
      },
      es: {
        title: 'Bicicleta de cicloturismo Nilo',
        description:
          'Portabultos delante y detrás, dieciocho velocidades y un sillín en el que se puede pasar la semana. Hecha para ir de pueblo en pueblo.',
        bikeModel: 'Nile Tourer 18',
      },
      de: {
        title: 'Nil-Reiserad',
        description:
          'Gepäckträger vorn und hinten, achtzehn Gänge und ein Sattel für die ganze Woche. Gebaut für die Strecke zwischen Orten, nicht um einen herum.',
        bikeModel: 'Nile Tourer 18',
      },
    },
  },

  // --- 7. Kids: cheapest entry price on the listing --------------------------
  {
    slug: 'demo-little-scarab-kids-bike',
    bikeType: 'rental',
    category: 'kids',
    asset: 'destLuxor',
    rental: {
      electric: false,
      gears: 1,
      weightKg: 9,
      frameSizes: ['XS'],
      deposit: 20,
      inventory: 10,
      pricingMode: 'both',
      hourlyRate: 3,
      extraHourRate: 2,
      minHours: 1,
      maxHours: 24,
      hourStep: 1,
      bands: [
        { hours: 6, price: 11, labels: HALF, popular: true },
        { hours: 12, price: 16, labels: FULL },
      ],
      pickupSlots: ['09:00', '11:00', '15:00'],
      accessories: KIT.family,
    },
    copy: {
      en: {
        title: 'Little Scarab Kids Bike',
        description:
          'A single-speed for riders under about twelve, with a child helmet included and training wheels on request.',
        bikeModel: 'Little Scarab 20"',
      },
      es: {
        title: 'Bicicleta infantil Little Scarab',
        description:
          'Una monomarcha para ciclistas de hasta unos doce años, con casco infantil incluido y ruedines a petición.',
        bikeModel: 'Little Scarab 20"',
      },
      de: {
        title: 'Little Scarab Kinderrad',
        description:
          'Ein Eingangrad für Fahrer bis etwa zwölf Jahre, mit Kinderhelm und Stützrädern auf Wunsch.',
        bikeModel: 'Little Scarab 20"',
      },
    },
  },

  // --- 8. Guided ride: gives the type tabs something on the other side -------
  {
    slug: 'demo-pyramid-fields-ride',
    bikeType: 'tour',
    category: 'mountain',
    asset: 'destCairo',
    ride: {
      distanceKm: 24,
      elevationGainM: 180,
      difficulty: 'moderate',
      durationHours: 4,
      pricePerPerson: 65,
      minAge: 14,
      maxGroupSize: 8,
      startTimes: ['06:30', '15:30'],
      stops: {
        en: [
          { stopName: 'Saqqara causeway', stopDescription: 'The step pyramid from the palm groves below.' },
          { stopName: 'Abusir', stopDescription: 'Four pyramids and almost no one else.' },
          { stopName: 'Giza plateau edge', stopDescription: 'The last climb, and the whole field laid out beneath you.' },
        ],
        es: [
          { stopName: 'Calzada de Saqqara', stopDescription: 'La pirámide escalonada vista desde los palmerales.' },
          { stopName: 'Abusir', stopDescription: 'Cuatro pirámides y casi nadie más.' },
          { stopName: 'Borde de la meseta de Guiza', stopDescription: 'La última subida y todo el campo de pirámides a sus pies.' },
        ],
        de: [
          { stopName: 'Saqqara-Aufweg', stopDescription: 'Die Stufenpyramide von den Palmenhainen aus.' },
          { stopName: 'Abusir', stopDescription: 'Vier Pyramiden und fast niemand sonst.' },
          { stopName: 'Rand des Gizeh-Plateaus', stopDescription: 'Der letzte Anstieg — und das ganze Feld liegt unter Ihnen.' },
        ],
      },
    },
    copy: {
      en: {
        title: 'Pyramid Fields Guided Ride',
        description:
          'Saqqara to Giza along the desert edge, twenty-four kilometres on quiet tracks with a guide and a support vehicle.',
        routeName: 'The Memphis necropolis route',
      },
      es: {
        title: 'Ruta guiada por los campos de pirámides',
        description:
          'De Saqqara a Guiza por el borde del desierto: veinticuatro kilómetros por pistas tranquilas con guía y vehículo de apoyo.',
        routeName: 'Ruta de la necrópolis de Menfis',
      },
      de: {
        title: 'Geführte Tour durch die Pyramidenfelder',
        description:
          'Von Saqqara nach Gizeh am Wüstenrand entlang — vierundzwanzig Kilometer auf ruhigen Wegen mit Guide und Begleitfahrzeug.',
        routeName: 'Route der Nekropole von Memphis',
      },
    },
  },

  // --- 9. An easy guided ride, so the difficulty facet has a second value ----
  {
    slug: 'demo-west-bank-sunset-ride',
    bikeType: 'tour',
    category: 'city',
    asset: 'destLuxor',
    ride: {
      distanceKm: 11,
      elevationGainM: 40,
      difficulty: 'easy',
      durationHours: 2.5,
      pricePerPerson: 38,
      minAge: 8,
      maxGroupSize: 12,
      startTimes: ['16:00', '17:00'],
      stops: {
        en: [
          { stopName: 'Colossi of Memnon', stopDescription: 'The two seated kings, and the flat road that starts here.' },
          { stopName: 'Sugarcane lanes', stopDescription: 'Green, shaded, and level the whole way.' },
          { stopName: 'The ferry landing', stopDescription: 'Sunset over the river, bikes on the boat.' },
        ],
        es: [
          { stopName: 'Colosos de Memnón', stopDescription: 'Los dos reyes sentados y el camino llano que empieza aquí.' },
          { stopName: 'Caminos de caña de azúcar', stopDescription: 'Verdes, sombreados y llanos todo el trayecto.' },
          { stopName: 'Embarcadero', stopDescription: 'Puesta de sol sobre el río, con las bicicletas en el barco.' },
        ],
        de: [
          { stopName: 'Memnonkolosse', stopDescription: 'Die beiden sitzenden Könige — und der flache Weg, der hier beginnt.' },
          { stopName: 'Zuckerrohrwege', stopDescription: 'Grün, schattig und durchweg eben.' },
          { stopName: 'Die Fähranlegestelle', stopDescription: 'Sonnenuntergang über dem Fluss, die Räder an Bord.' },
        ],
      },
    },
    copy: {
      en: {
        title: 'West Bank Sunset Ride',
        description:
          'Eleven flat kilometres through the sugarcane to the ferry, timed to put the sun on the river as you arrive.',
        routeName: 'The Theban west bank lanes',
      },
      es: {
        title: 'Ruta del atardecer por la orilla oeste',
        description:
          'Once kilómetros llanos entre cañaverales hasta el embarcadero, con la puesta de sol sobre el río a la llegada.',
        routeName: 'Caminos de la orilla oeste tebana',
      },
      de: {
        title: 'Sonnenuntergangstour am Westufer',
        description:
          'Elf flache Kilometer durch das Zuckerrohr bis zur Fähre — zeitlich so gelegt, dass die Sonne bei der Ankunft auf dem Fluss steht.',
        routeName: 'Die Wege am thebanischen Westufer',
      },
    },
  },
]

const SLUGS = demoBicycles.map((bike) => bike.slug)

const otherLocales = locales.filter((locale) => locale !== defaultLocale)
const list = (items: string[]) => items.map((text) => ({ text }))
const times = (items: string[]) => items.map((time) => ({ time }))

type Row = Record<string, unknown>

/**
 * Copies the row ids the default-locale write assigned onto the same rows of a
 * translation payload.
 *
 * Arrays here are not localized — one set of rows is shared and only the marked
 * subfields (durationLabel, note, stopName) vary by language. A row sent without its id
 * is a *new* row, so an update that omits them replaces the array wholesale and takes
 * every other translation with it; seeded that way only the last locale written
 * survives. Matching by position is safe because both arrays are built from the same
 * source below. Mirrors `withRowIds` in seed-services.ts.
 */
const withRowIds = (created: Row, translation: Row): Row => {
  const out: Row = { ...translation }

  for (const [key, value] of Object.entries(translation)) {
    const rows = created[key]
    if (!Array.isArray(value) || !Array.isArray(rows)) continue

    out[key] = value.map((row, index) => {
      const id = (rows[index] as Row | undefined)?.id
      return id && row && typeof row === 'object' ? { ...(row as Row), id } : row
    })
  }

  return out
}

/** Fields shared by every language on one bike. */
const baseFields = (bike: DemoBike, imageId: string | undefined): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    bikeType: bike.bikeType,
    category: bike.category,
    slug: bike.slug,
    ...(imageId ? { image: imageId } : {}),
  }

  if (bike.rental) {
    const r = bike.rental
    Object.assign(base, {
      deposit: r.deposit,
      inventory: r.inventory,
      specs: {
        gears: r.gears,
        electric: r.electric,
        weightKg: r.weightKg,
        frameSize: r.frameSizes[0] ?? 'M',
        frameSizes: r.frameSizes,
      },
      pricingMode: r.pricingMode,
      hourlyRate: r.hourlyRate ?? null,
      extraHourRate: r.extraHourRate ?? null,
      minHours: r.minHours,
      maxHours: r.maxHours,
      hourStep: r.hourStep,
      pickupSlots: times(r.pickupSlots),
      deliveryFee: r.deliveryFee ?? null,
      weekendSurchargePct: r.weekendSurchargePct ?? null,
    })
  }

  if (bike.ride) {
    const r = bike.ride
    Object.assign(base, {
      distanceKm: r.distanceKm,
      elevationGainM: r.elevationGainM,
      difficulty: r.difficulty,
      durationHours: r.durationHours,
      pricePerPerson: r.pricePerPerson,
      minAge: r.minAge,
      maxGroupSize: r.maxGroupSize,
      guideIncluded: true,
      bikeIncluded: true,
      startTimes: times(r.startTimes),
    })
  }

  return base
}

/** Fields that differ per language. */
const localeFields = (bike: DemoBike, locale: Locale): Record<string, unknown> => {
  const copy = bike.copy[locale]
  const data: Record<string, unknown> = {
    title: copy.title,
    description: copy.description,
  }

  if (bike.rental) {
    data.bikeModel = copy.bikeModel
    data.rentalPricing = bike.rental.bands.map((band) => ({
      durationLabel: band.labels[locale],
      durationHours: band.hours,
      price: band.price,
      popular: band.popular ?? false,
      note: band.notes ? band.notes[locale] : '',
    }))
    data.includedAccessories = list(bike.rental.accessories[locale])
  }

  if (bike.ride) {
    data.routeName = copy.routeName
    const stops = bike.ride.stops[locale]
    data.routePlan = stops.map((stop, index) => ({
      stopName: stop.stopName,
      stopDescription: stop.stopDescription,
      distanceFromStartKm: Math.round((bike.ride!.distanceKm / stops.length) * (index + 1)),
    }))
  }

  return data
}

const run = async () => {
  const payload = await getPayload({ config })
  const clear = process.argv.includes('--clear')

  // --- clear ---------------------------------------------------------------
  if (clear) {
    const { docs } = await payload.find({
      collection: 'bicycles',
      where: { slug: { in: SLUGS } },
      limit: 100,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })

    for (const doc of docs) {
      await payload.delete({ collection: 'bicycles', id: doc.id, overrideAccess: true })
      payload.logger.info(`removed ${(doc as { slug?: string }).slug ?? doc.id}`)
    }

    payload.logger.info(`--- removed ${docs.length} demo bicycle(s) ---`)
    await revalidateRemote(['bicycles'], (message) => payload.logger.info(message))
    process.exit(0)
  }

  // --- media ---------------------------------------------------------------
  /**
   * Reuses whatever the main seed uploaded rather than shipping its own photographs.
   * Matched on filename because that is what `uploadAssets` derives from the asset key;
   * a bike whose asset is missing simply goes out without an image, which the card and
   * the hero both handle, rather than failing the whole run.
   */
  const { docs: mediaDocs } = await payload.find({
    collection: 'media',
    limit: 200,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const mediaByHint = new Map<string, string>()
  for (const doc of mediaDocs) {
    const filename = String((doc as { filename?: string }).filename ?? '').toLowerCase()
    if (filename) mediaByHint.set(filename, String(doc.id))
  }

  const findImage = (asset: string): string | undefined => {
    const needle = asset.toLowerCase().replace(/^dest/, '')
    for (const [filename, id] of mediaByHint) {
      if (filename.includes(needle)) return id
    }
    // Any image beats none: the demo is about the layout, and an empty frame on every
    // card misrepresents how the listing actually looks.
    return mediaDocs.length ? String(mediaDocs[0].id) : undefined
  }

  // --- write ---------------------------------------------------------------
  const { docs: existing } = await payload.find({
    collection: 'bicycles',
    where: { slug: { in: SLUGS } },
    limit: 100,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const idBySlug = new Map(
    existing.map((doc) => [String((doc as { slug?: string }).slug), String(doc.id)]),
  )

  let created = 0
  let updated = 0
  const failed: string[] = []

  for (const bike of demoBicycles) {
    const base = baseFields(bike, findImage(bike.asset))
    const existingId = idBySlug.get(bike.slug)

    try {
      // The default locale is written first and the translations are patched onto it,
      // mirroring `createTranslated` in seed-services.ts — Payload stores one array per
      // language, so localized arrays must be sent whole for every locale.
      const doc = existingId
        ? await payload.update({
            collection: 'bicycles',
            id: existingId,
            locale: defaultLocale,
            data: { ...base, ...localeFields(bike, defaultLocale), _status: 'published' } as never,
            overrideAccess: true,
          })
        : await payload.create({
            collection: 'bicycles',
            locale: defaultLocale,
            data: { ...base, ...localeFields(bike, defaultLocale), _status: 'published' } as never,
            overrideAccess: true,
          })

      for (const locale of otherLocales) {
        await payload.update({
          collection: 'bicycles',
          id: doc.id,
          locale,
          data: {
            ...withRowIds(doc as unknown as Row, localeFields(bike, locale)),
            _status: 'published',
          } as never,
          overrideAccess: true,
        })
      }

      if (existingId) updated += 1
      else created += 1
      payload.logger.info(`${existingId ? 'updated' : 'created'} ${bike.slug}`)
    } catch (error) {
      /**
       * One bad record is skipped, not fatal — but the reason has to survive. A bare
       * count of failures reads as "nothing was wrong" when the cause was a timeout.
       */
      const detail = error as { message?: string; data?: { errors?: Array<{ path?: string }> } }
      const fields = detail.data?.errors?.map((entry) => entry.path).filter(Boolean) ?? []
      failed.push(
        fields.length
          ? `${bike.slug} — required but empty: ${fields.slice(0, 4).join(', ')}`
          : `${bike.slug} — ${detail.message ?? String(error)}`,
      )
    }
  }

  payload.logger.info(`--- ${created} created, ${updated} updated, ${failed.length} failed ---`)
  for (const line of failed) payload.logger.warn(line)

  await revalidateRemote(['bicycles'], (message) => payload.logger.info(message))
  process.exit(failed.length ? 1 : 0)
}

await run().catch((error: unknown) => {
  const detail = error as { message?: string; data?: { errors?: Array<{ path?: string }> } }
  console.error('[demo:bicycles]', detail.message ?? error)

  // Payload validation failures carry the offending field paths; without printing them
  // the error is just "The following field is invalid" and tells you nothing.
  const paths = detail.data?.errors?.map((entry) => entry.path).filter(Boolean)
  if (paths?.length) console.error('[demo:bicycles] invalid fields:', paths.join(', '))

  process.exit(1)
})
