import {
  calculateHotelTotal, calculateDailyTourTotal, calculateExperienceTotal,
  calculateTransferTotal, calculateBicycleRentalTotal, applyTotals,
  nightsBetween, resolveSeasonMultiplier, resolveTierPrice,
} from '../src/lib/pricing.ts'

let pass = 0, fail = 0
const eq = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ok  ${name}`) }
  else { fail++; console.log(`FAIL  ${name}\n      got ${a}\n      want ${e}`) }
}

// --- helpers
eq('nightsBetween 3 nights', nightsBetween('2026-03-01', '2026-03-04'), 3)
eq('nightsBetween same day -> 1', nightsBetween('2026-03-01', '2026-03-01'), 1)
eq('season multiplier hit', resolveSeasonMultiplier(
  [{ startDate: '2026-12-01', endDate: '2027-01-10', multiplier: 1.25 }], '2026-12-20'), 1.25)
eq('season multiplier miss -> 1', resolveSeasonMultiplier(
  [{ startDate: '2026-12-01', endDate: '2027-01-10', multiplier: 1.25 }], '2026-06-20'), 1)
eq('season multiplier 0 -> 1', resolveSeasonMultiplier(
  [{ startDate: '2026-01-01', endDate: '2026-12-31', multiplier: 0 }], '2026-06-20'), 1)

// --- hotel: 2 guests sharing a double, 3 nights, per-person 100 => 100*2*3 = 600
const rooms = [{ id: 'r1', roomName: 'Deluxe', maxOccupancy: 3, extraBedPrice: 40,
  pricing: { singlePrice: 150, doublePrice: 100, triplePrice: 80 } }]
eq('hotel double 2pax x3n', calculateHotelTotal({
  roomTypes: rooms, selections: [{ roomTypeId: 'r1', occupancy: 'double', guests: 2 }],
  checkIn: '2026-03-01', checkOut: '2026-03-04' }).subtotal, 600)

// single: 150*1*3 = 450
eq('hotel single 1pax x3n', calculateHotelTotal({
  roomTypes: rooms, selections: [{ roomTypeId: 'r1', occupancy: 'single', guests: 1 }],
  checkIn: '2026-03-01', checkOut: '2026-03-04' }).subtotal, 450)

// season 1.25: 100*2*3*1.25 = 750
eq('hotel with high season', calculateHotelTotal({
  roomTypes: rooms, selections: [{ roomTypeId: 'r1', occupancy: 'double', guests: 2 }],
  checkIn: '2026-12-20', checkOut: '2026-12-23',
  seasonalRates: [{ startDate: '2026-12-01', endDate: '2027-01-10', multiplier: 1.25 }] }).subtotal, 750)

// 2 rooms quantity: 600*2 = 1200
eq('hotel 2 rooms', calculateHotelTotal({
  roomTypes: rooms, selections: [{ roomTypeId: 'r1', occupancy: 'double', guests: 2, quantity: 2 }],
  checkIn: '2026-03-01', checkOut: '2026-03-04' }).subtotal, 1200)

// extra bed: double band=2, 3 guests => 100*2*3n + 40*1*3n = 600+120=720
eq('hotel extra bed', calculateHotelTotal({
  roomTypes: rooms, selections: [{ roomTypeId: 'r1', occupancy: 'double', guests: 3 }],
  checkIn: '2026-03-01', checkOut: '2026-03-04' }).subtotal, 720)

eq('hotel unknown room -> 0', calculateHotelTotal({
  roomTypes: rooms, selections: [{ roomTypeId: 'nope', occupancy: 'double' }],
  nights: 3 }).subtotal, 0)

// --- daily tour: 2 adults @80 + 1 child @40 = 200
eq('daily tour', calculateDailyTourTotal({
  tour: { pricePerPerson: 80, childPrice: 40 }, adults: 2, children: 1 }).subtotal, 200)
eq('daily tour child falls back to adult rate', calculateDailyTourTotal({
  tour: { pricePerPerson: 80 }, adults: 1, children: 1 }).subtotal, 160)
eq('daily private group flat', calculateDailyTourTotal({
  tour: { pricePerPerson: 80, privateGroupPrice: 500 }, adults: 9, privateGroup: true }).subtotal, 500)

// --- tiers
const tiers = [{ minPax: 1, maxPax: 2, pricePerPerson: 1200 },
               { minPax: 3, maxPax: 5, pricePerPerson: 1000 },
               { minPax: 6, maxPax: 12, pricePerPerson: 850 }]
eq('tier 4pax -> 1000', resolveTierPrice(tiers, 4, 1500), 1000)
eq('tier 8pax -> 850', resolveTierPrice(tiers, 8, 1500), 850)
eq('tier 99pax -> base', resolveTierPrice(tiers, 99, 1500), 1500)

// experience: 4 pax @1000 = 4000, +1 single supplement 300 => 4300
eq('experience tiered + supplement', calculateExperienceTotal({
  experience: { pricing: { basePricePerPerson: 1500, singleSupplement: 300, priceTiers: tiers } },
  travellers: 4, singleRooms: 1 }).subtotal, 4300)

// departure override beats tier: 4 pax @1100 = 4400
eq('experience departure override', calculateExperienceTotal({
  experience: { pricing: { basePricePerPerson: 1500, priceTiers: tiers },
    departureDates: [{ date: '2026-05-01', priceOverride: 1100 }] },
  travellers: 4, departureDate: '2026-05-01' }).subtotal, 4400)

// --- transfer: round trip doubles
const vp = [{ vehicleClass: 'Sedan', maxPassengers: 3, price: 45 },
            { vehicleClass: 'VIP Van', maxPassengers: 7, price: 90 }]
eq('transfer one way', calculateTransferTotal({ vehiclePricing: vp, vehicleClass: 'Sedan' }).subtotal, 45)
eq('transfer round trip', calculateTransferTotal({ vehiclePricing: vp, vehicleClass: 'Sedan', roundTrip: true }).subtotal, 90)
eq('transfer unknown class -> 0', calculateTransferTotal({ vehiclePricing: vp, vehicleClass: 'Bus' }).subtotal, 0)

// --- bicycle bands: 5h should pick the half-day (6h/25), not 5x hourly(8)
const bands = [{ durationLabel: '1 hour', durationHours: 1, price: 8 },
               { durationLabel: 'Half day', durationHours: 6, price: 25 },
               { durationLabel: 'Full day', durationHours: 12, price: 40 }]
eq('bike 5h -> half day', calculateBicycleRentalTotal({ bands, hours: 5 }).subtotal, 25)
eq('bike 1h -> hourly', calculateBicycleRentalTotal({ bands, hours: 1 }).subtotal, 8)
eq('bike 2 bikes half day', calculateBicycleRentalTotal({ bands, hours: 5, quantity: 2 }).subtotal, 50)
eq('bike 30h -> 3 full days', calculateBicycleRentalTotal({ bands, hours: 30 }).subtotal, 120)

// --- totals
eq('totals with tax', applyTotals({ subtotal: 1000, discount: 100, taxRate: 0.14 }),
   { subtotal: 1000, discount: 100, tax: 126, total: 1026 })
eq('discount cannot exceed subtotal', applyTotals({ subtotal: 100, discount: 500 }),
   { subtotal: 100, discount: 100, tax: 0, total: 0 })

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
