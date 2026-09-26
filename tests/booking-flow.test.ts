import { estimateBooking, isWeekendDate, stayNights } from '../src/lib/booking/estimate.ts'
import { validateContact, validateDetails, isValidPhone } from '../src/lib/booking/validate.ts'
import {
  calculateHotelTotal, calculateDailyTourTotal, calculateBicycleRentalTotal,
} from '../src/lib/pricing.ts'

/**
 * The checkout wizard's estimate and step validation.
 *
 * The estimate's whole job is to equal what /api/bookings records, so each service is
 * checked against the same pricing call the route makes with the same inputs.
 */

let pass = 0, fail = 0
const eq = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ok  ${name}`) }
  else { fail++; console.log(`FAIL  ${name}\n      got ${a}\n      want ${e}`) }
}

const base = {
  serviceType: null,
  itemSnapshot: null,
  dates: { start: null, end: null },
  travelers: { adults: 2, children: 0, infants: 0 },
  hotelSelection: [],
  transferDetails: null,
  bicycleSelection: null,
  tourOptions: { startTime: '', singleRooms: 0 },
  extras: [],
  contact: { firstName: 'Ana', lastName: '', email: 'ana@example.com', phone: '+20 100 123 4567', country: '', notes: '' },
} as any

const today = '2026-09-26'

// --- day tour: children at their own rate, infants free ------------------------
const daily = {
  ...base,
  serviceType: 'dailyTour',
  itemSnapshot: { id: 't', slug: 't', label: 'Pyramids', pricing: {
    kind: 'dailyTour', pricePerPerson: 80, childPrice: 40, startTimes: ['08:00', '13:00'], groupSizeMax: 6 } },
  dates: { start: '2026-10-02', end: null },
  travelers: { adults: 2, children: 1, infants: 1 },
  tourOptions: { startTime: '08:00', singleRooms: 0 },
}
console.log('--- day tour ---')
eq('day tour estimate = server calc', estimateBooking(daily).subtotal,
  calculateDailyTourTotal({ tour: { pricePerPerson: 80, childPrice: 40 }, adults: 2, children: 1 }).subtotal)
eq('day tour 2×80 + 1×40 = 200', estimateBooking(daily).subtotal, 200)
eq('day tour valid', validateDetails(daily, today), {})
eq('day tour needs a start time', validateDetails({ ...daily, tourOptions: { startTime: '', singleRooms: 0 } }, today).startTime, 'startTimeRequired')
eq('day tour rejects past date', validateDetails({ ...daily, dates: { start: '2026-09-01', end: null } }, today).start, 'datePast')
eq('day tour rejects no date', validateDetails({ ...daily, dates: { start: null, end: null } }, today).start, 'dateRequired')
eq('day tour group limit', validateDetails({ ...daily, travelers: { adults: 5, children: 2, infants: 0 } }, today).adults, 'groupTooLarge')

// --- experience: tiers and single supplement ----------------------------------
const experience = {
  ...base,
  serviceType: 'experience',
  itemSnapshot: { id: 'e', slug: 'e', label: 'Nile', pricing: {
    kind: 'experience', basePricePerPerson: 1000, singleSupplement: 200,
    priceTiers: [{ minPax: 1, maxPax: 2, pricePerPerson: 1200 }, { minPax: 3, maxPax: 0, pricePerPerson: 900 }],
    groupSizeMax: null, durationDays: 5 } },
  dates: { start: '2026-11-01', end: null },
  travelers: { adults: 3, children: 0, infants: 0 },
  tourOptions: { startTime: '', singleRooms: 1 },
}
console.log('--- experience ---')
eq('experience tier 3×900 + 1 single 200', estimateBooking(experience).subtotal, 2900)
eq('experience single rooms > party rejected',
  validateDetails({ ...experience, tourOptions: { startTime: '', singleRooms: 4 } }, today).singleRooms, 'singleRoomsTooMany')

// --- hotel: nights and season ----------------------------------------------------
const roomTypes = [{ id: 'r1', roomName: 'Deluxe', maxOccupancy: 3, extraBedPrice: 40,
  pricing: { singlePrice: 150, doublePrice: 100, triplePrice: 80 } }]
const seasonalRates = [{ label: 'Peak', startDate: '2026-12-01', endDate: '2027-01-10', multiplier: 1.25 }]
const hotel = {
  ...base,
  serviceType: 'hotel',
  itemSnapshot: { id: 'h', slug: 'h', label: 'Old Cataract', pricing: {
    kind: 'hotel', roomTypes, seasonalRates, checkInTime: '14:00', checkOutTime: '12:00' } },
  dates: { start: '2026-12-20', end: '2026-12-23' },
  hotelSelection: [{ roomTypeId: 'r1', roomName: 'Deluxe', occupancy: 'double', guests: 2, quantity: 2, unitPrice: 100 }],
}
console.log('--- hotel ---')
eq('hotel estimate = server calc (nights + season)', estimateBooking(hotel).subtotal,
  calculateHotelTotal({ roomTypes, selections: hotel.hotelSelection, checkIn: '2026-12-20', checkOut: '2026-12-23', seasonalRates }).subtotal)
eq('hotel 100×2×3n×1.25 ×2 rooms = 1500', estimateBooking(hotel).subtotal, 1500)
eq('hotel stay nights', stayNights(hotel), 3)
eq('hotel valid', validateDetails(hotel, today), {})
eq('hotel checkout must follow checkin',
  validateDetails({ ...hotel, dates: { start: '2026-12-20', end: '2026-12-20' } }, today).end, 'checkoutAfterCheckin')
eq('hotel with no rooms', validateDetails({ ...hotel, hotelSelection: [] }, today).rooms, 'roomsRequired')
eq('hotel room over capacity',
  validateDetails({ ...hotel, hotelSelection: [{ ...hotel.hotelSelection[0], guests: 4 }] }, today)['room:r1:double'],
  'roomGuestsTooMany')

// --- bike rental: weekend derived from the date ------------------------------
const config = { pricingMode: 'both', hourlyRate: 6, extraHourRate: null, minHours: 1, maxHours: 24,
  hourStep: 1, deliveryFee: 5, weekendSurchargePct: 10 }
const bands = [{ durationLabel: 'Half day', durationHours: 6, price: 18 }]
const rental = {
  ...base,
  serviceType: 'bicycle',
  itemSnapshot: { id: 'b', slug: 'b', label: 'City bike', pricing: {
    kind: 'bikeRental', config, bands, pickupSlots: ['09:00'], inventory: 3, deposit: 50 } },
  dates: { start: '2026-10-02', end: null }, // a Friday
  bicycleSelection: { durationLabel: '5h', durationHours: 5, quantity: 2, pickupDate: '2026-10-02',
    pickupTime: '09:00', returnTime: '14:00', weekend: false, delivery: true, unitPrice: 18 },
}
console.log('--- bike rental ---')
eq('2026-10-02 is a Friday (weekend)', isWeekendDate('2026-10-02'), true)
eq('2026-10-04 is a Sunday (not weekend)', isWeekendDate('2026-10-04'), false)
eq('rental estimate = server calc, weekend from date not flag', estimateBooking(rental).subtotal,
  calculateBicycleRentalTotal({ ...config, bands, hours: 5, quantity: 2, weekend: true, delivery: true }).subtotal)
eq('rental over inventory', validateDetails({ ...rental, bicycleSelection: { ...rental.bicycleSelection, quantity: 4 } }, today).quantity, 'quantityTooMany')
eq('rental valid', validateDetails(rental, today), {})

// --- guided ride: billed per rider chosen, not per default adult -------------
const ride = {
  ...base,
  serviceType: 'bicycle',
  travelers: { adults: 2, children: 0, infants: 0 },
  itemSnapshot: { id: 'g', slug: 'g', label: 'Luxor West Bank', pricing: {
    kind: 'guidedRide', pricePerPerson: 45, startTimes: ['07:00'], durationHours: 3, maxGroupSize: 8, minAge: 12 } },
  dates: { start: '2026-10-05', end: null },
  bicycleSelection: { durationLabel: '3 h', durationHours: 3, quantity: 1, pickupDate: '2026-10-05',
    pickupTime: '07:00', returnTime: '10:00', weekend: false, delivery: false, unitPrice: 45 },
}
console.log('--- guided ride ---')
eq('solo rider pays for one seat, not the default two adults', estimateBooking(ride).subtotal, 45)
eq('ride over group size', validateDetails({ ...ride, bicycleSelection: { ...ride.bicycleSelection, quantity: 9 } }, today).quantity, 'groupTooLarge')

// --- contact ---------------------------------------------------------------------
console.log('--- contact ---')
eq('contact valid', validateContact(base.contact), {})
eq('phone required', validateContact({ ...base.contact, phone: '' }).phone, 'required')
eq('email shape checked', validateContact({ ...base.contact, email: 'ana@' }).email, 'emailInvalid')
eq('phone with letters rejected', isValidPhone('call me'), false)
eq('phone too short rejected', isValidPhone('12345'), false)
eq('phone with spaces and + accepted', isValidPhone('+44 (0)20 7946-0958'), true)
eq('empty basket flagged', validateDetails(base, today), { item: 'itemMissing' })

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
