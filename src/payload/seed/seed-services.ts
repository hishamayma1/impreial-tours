import type { Payload } from 'payload'
import { locales, defaultLocale, type Locale } from '../../i18n/routing'
import { tourSeeds, hotelSeeds, transferSeeds, bicycleSeeds } from './services-data'

type MediaIds = Record<string, string>

const otherLocales = locales.filter((locale) => locale !== defaultLocale)

const list = (items: string[]) => items.map((text) => ({ text }))

/** Minimal Lexical document — enough for a seeded richText field to render. */
const richText = (paragraph: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [
          { type: 'text', text: paragraph, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
        ],
      },
    ],
  },
})

type Row = Record<string, unknown>

/**
 * Copies the row ids the default-locale create assigned onto the same rows of a
 * translation payload.
 *
 * Arrays are not localized in these collections — one set of rows is shared and only
 * the marked subfields (dayTitle, roomName, …) vary by language. A row sent
 * without its id is a new row, so an update that omits them replaces the array
 * wholesale and takes every translation stored against the old rows with it: seeded
 * that way, only the last locale written survived and the itinerary rendered blank in
 * the other two. Matching by position is safe here because the translation arrays are
 * built from the same seed arrays as the create.
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

/**
 * Creates the default-locale document then patches each translation onto it, mirroring
 * createLocalized in run.ts. Localized array fields (highlights, itinerary days, room
 * names) must be sent whole on every locale — Payload stores one array per language.
 */
const createTranslated = async (
  payload: Payload,
  collection: 'tours' | 'hotels' | 'transfers' | 'bicycles',
  base: Record<string, unknown>,
  perLocale: Record<Locale, Record<string, unknown>>,
): Promise<string> => {
  const doc = await payload.create({
    collection,
    locale: defaultLocale,
    data: { ...base, ...perLocale[defaultLocale], _status: 'published' } as never,
    overrideAccess: true,
  })

  for (const locale of otherLocales) {
    await payload.update({
      collection,
      id: doc.id,
      locale,
      data: { ...withRowIds(doc as unknown as Row, perLocale[locale]), _status: 'published' } as never,
      overrideAccess: true,
    })
  }

  return String(doc.id)
}

export const seedServices = async (payload: Payload, media: MediaIds, destinationIds: string[]) => {
  const image = (key: string) => media[key]
  const pickDestination = (index: number) =>
    destinationIds.length ? destinationIds[index % destinationIds.length] : undefined

  // --- Tours ---------------------------------------------------------------
  for (const [index, tour] of tourSeeds.entries()) {
    const base: Record<string, unknown> = {
      tourType: tour.tourType,
      heroImage: image(tour.asset),
      destination: pickDestination(index),
      difficulty: tour.difficulty,
      rating: tour.rating,
      badge: tour.badge,
      groupSizeMax: tour.groupSizeMax,
      languages: ['en', 'es', 'de'],
    }

    if (tour.daily) {
      Object.assign(base, {
        durationHours: tour.daily.durationHours,
        startTimes: tour.daily.startTimes.map((time) => ({ time })),
        availableWeekdays: tour.daily.availableWeekdays,
        pricePerPerson: tour.daily.pricePerPerson,
        childPrice: tour.daily.childPrice,
        privateGroupPrice: tour.daily.privateGroupPrice,
        instantConfirmation: true,
      })
    }

    if (tour.experience) {
      Object.assign(base, {
        durationDays: tour.experience.durationDays,
        nights: tour.experience.nights,
        accommodationIncluded: true,
        pricing: {
          basePricePerPerson: tour.experience.basePricePerPerson,
          singleSupplement: tour.experience.singleSupplement,
          priceTiers: tour.experience.priceTiers,
        },
      })
    }

    const perLocale = Object.fromEntries(
      locales.map((locale) => {
        const copy = tour.copy[locale]
        const data: Record<string, unknown> = {
          title: copy.title,
          shortDescription: copy.shortDescription,
          meetingPoint: copy.meetingPoint,
          overview: richText(copy.shortDescription),
          highlights: list(copy.highlights),
          included: list(copy.included),
        }
        if (tour.experience) {
          data.itinerary = tour.experience.days[locale].map((day, i) => ({
            dayNumber: i + 1,
            dayTitle: day.dayTitle,
            dayDescription: day.dayDescription,
            meals: i === 0 ? ['dinner'] : ['breakfast', 'lunch', 'dinner'],
          }))
        }
        /**
         * Written per locale rather than into `base`, because `offer.label` is
         * localized: the group is sent whole on every locale, so putting `active` in
         * `base` and the label here would have the per-locale write replace the group
         * and drop the flag.
         */
        if (tour.offer) {
          data.offer = { active: true, label: tour.offer.label[locale] }
        }
        return [locale, data]
      }),
    ) as unknown as Record<Locale, Record<string, unknown>>

    await createTranslated(payload, 'tours', base, perLocale)
  }
  payload.logger.info(`Seeded ${tourSeeds.length} tours`)

  // --- Hotels --------------------------------------------------------------
  for (const [index, hotel] of hotelSeeds.entries()) {
    const base: Record<string, unknown> = {
      heroImage: image(hotel.asset),
      destination: pickDestination(index),
      starRating: hotel.starRating,
      amenities: hotel.amenities,
      checkInTime: '14:00',
      checkOutTime: '12:00',
    }

    const perLocale = Object.fromEntries(
      locales.map((locale) => {
        const copy = hotel.copy[locale]
        return [
          locale,
          {
            name: copy.name,
            address: copy.address,
            description: richText(copy.description),
            roomTypes: hotel.rooms.map((room) => ({
              roomName: room.names[locale].roomName,
              bedConfiguration: room.names[locale].bedConfiguration,
              maxOccupancy: room.maxOccupancy,
              inventory: room.inventory,
              breakfastIncluded: true,
              refundable: true,
              extraBedPrice: 45,
              pricing: {
                singlePrice: room.single,
                doublePrice: room.double,
                triplePrice: room.triple,
              },
            })),
            seasonalRates: hotel.seasons.map((season) => ({
              label: season.labels[locale],
              startDate: season.startDate,
              endDate: season.endDate,
              multiplier: season.multiplier,
            })),
          },
        ]
      }),
    ) as unknown as Record<Locale, Record<string, unknown>>

    await createTranslated(payload, 'hotels', base, perLocale)
  }
  payload.logger.info(`Seeded ${hotelSeeds.length} hotels`)

  // --- Transfers -----------------------------------------------------------
  for (const transfer of transferSeeds) {
    const base: Record<string, unknown> = {
      transferType: transfer.transferType,
      meetAndGreet: true,
      freeWaitingMinutes: 60,
      direction: 'roundTrip',
    }

    const perLocale = Object.fromEntries(
      locales.map((locale) => {
        const copy = transfer.copy[locale]
        const vehicles = transfer.vehicles.map((v) => ({
          className: v.names[locale],
          maxPassengers: v.maxPassengers,
          maxLuggage: v.maxLuggage,
        }))

        const priceRows = (prices: Array<{ price: number; vehicleIndex: number }>) =>
          prices.map((p) => ({
            vehicleClass: transfer.vehicles[p.vehicleIndex].names[locale],
            maxPassengers: transfer.vehicles[p.vehicleIndex].maxPassengers,
            maxLuggage: transfer.vehicles[p.vehicleIndex].maxLuggage,
            price: p.price,
          }))

        const data: Record<string, unknown> = {
          title: copy.title,
          description: copy.description,
          vehicles,
        }

        if (transfer.zones) {
          data.zones = transfer.zones.map((zone) => ({
            zoneName: zone.names[locale],
            vehiclePricing: priceRows(zone.prices),
          }))
        }
        if (transfer.routes) {
          data.routes = transfer.routes.map((route) => ({
            fromCity: route.names[locale].fromCity,
            toCity: route.names[locale].toCity,
            distanceKm: route.distanceKm,
            estimatedDurationMin: route.durationMin,
            vehiclePricing: priceRows(route.prices),
          }))
        }
        return [locale, data]
      }),
    ) as unknown as Record<Locale, Record<string, unknown>>

    await createTranslated(payload, 'transfers', base, perLocale)
  }
  payload.logger.info(`Seeded ${transferSeeds.length} transfers`)

  // --- Bicycles ------------------------------------------------------------
  for (const bike of bicycleSeeds) {
    const base: Record<string, unknown> = {
      bikeType: bike.bikeType,
      image: image(bike.asset),
    }

    if (bike.rental) {
      Object.assign(base, {
        deposit: bike.rental.deposit,
        inventory: bike.rental.inventory,
        specs: { gears: bike.rental.gears, electric: bike.rental.electric, frameSize: 'M' },
      })
    }
    if (bike.tour) {
      Object.assign(base, {
        distanceKm: bike.tour.distanceKm,
        elevationGainM: bike.tour.elevationGainM,
        difficulty: bike.tour.difficulty,
        durationHours: bike.tour.durationHours,
        pricePerPerson: bike.tour.pricePerPerson,
        minAge: bike.tour.minAge,
        maxGroupSize: bike.tour.maxGroupSize,
        guideIncluded: true,
        bikeIncluded: true,
        startTimes: bike.tour.startTimes.map((time) => ({ time })),
      })
    }

    const perLocale = Object.fromEntries(
      locales.map((locale) => {
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
          }))
          data.includedAccessories = list(bike.rental.accessories[locale])
        }
        if (bike.tour) {
          data.routeName = copy.routeName
          data.routePlan = bike.tour.stops[locale].map((stop, i) => ({
            stopName: stop.stopName,
            stopDescription: stop.stopDescription,
            distanceFromStartKm: Math.round((bike.tour!.distanceKm / bike.tour!.stops[locale].length) * (i + 1)),
          }))
        }
        return [locale, data]
      }),
    ) as unknown as Record<Locale, Record<string, unknown>>

    await createTranslated(payload, 'bicycles', base, perLocale)
  }
  payload.logger.info(`Seeded ${bicycleSeeds.length} bicycles`)
}
