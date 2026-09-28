import type { BookingStateSnapshot, ContactDetails } from '@/stores/booking-store'

/**
 * Per-step validation for the checkout wizard.
 *
 * Values are message keys under `booking.errors`, so the rules stay plain data and the
 * copy stays in the catalogue. These mirror the server's Zod schema and route checks;
 * they exist to put the message beside the field and to stop "Continue" moving on with
 * a booking the server would refuse. The server remains the gate that decides.
 */
export type StepErrors = Record<string, string>

const ISO = /^\d{4}-\d{2}-\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** 7–15 digits, optionally led by +, with the spaces and punctuation people type. */
export const isValidPhone = (raw: string): boolean => {
  const value = raw.trim()
  if (!/^\+?[\d\s().-]+$/.test(value)) return false
  const digits = value.replace(/\D/g, '').length
  return digits >= 7 && digits <= 15
}

export const isValidEmail = (raw: string): boolean => EMAIL.test(raw.trim())

const checkDate = (errors: StepErrors, key: string, value: string | null, today: string) => {
  if (!value || !ISO.test(value)) errors[key] = 'dateRequired'
  else if (value < today) errors[key] = 'datePast'
}

export const validateDetails = (state: BookingStateSnapshot, today: string): StepErrors => {
  const errors: StepErrors = {}
  const pricing = state.itemSnapshot?.pricing
  if (!pricing) {
    errors.item = 'itemMissing'
    return errors
  }

  const { adults, children } = state.travelers

  switch (pricing.kind) {
    case 'dailyTour':
    case 'experience': {
      checkDate(errors, 'start', state.dates.start, today)
      if (adults < 1) errors.adults = 'adultsMin'
      const party = adults + children
      if (pricing.groupSizeMax && party > pricing.groupSizeMax) errors.adults = 'groupTooLarge'
      if (pricing.kind === 'dailyTour' && pricing.startTimes.length && !state.tourOptions.startTime) {
        errors.startTime = 'startTimeRequired'
      }
      if (pricing.kind === 'experience' && state.tourOptions.singleRooms > party) {
        errors.singleRooms = 'singleRoomsTooMany'
      }
      break
    }

    case 'hotel': {
      checkDate(errors, 'start', state.dates.start, today)
      if (!state.dates.end || !ISO.test(state.dates.end)) errors.end = 'dateRequired'
      else if (state.dates.start && state.dates.end <= state.dates.start) {
        errors.end = 'checkoutAfterCheckin'
      }
      if (!state.hotelSelection.length) errors.rooms = 'roomsRequired'
      for (const room of state.hotelSelection) {
        const type = pricing.roomTypes.find((r) => r.id === room.roomTypeId)
        if (type && room.guests > type.maxOccupancy) {
          errors[`room:${room.roomTypeId}:${room.occupancy}`] = 'roomGuestsTooMany'
        }
      }
      break
    }

    case 'bikeRental': {
      checkDate(errors, 'start', state.dates.start, today)
      const quantity = state.bicycleSelection?.quantity ?? 0
      if (quantity < 1) errors.quantity = 'quantityMin'
      else if (pricing.inventory !== null && quantity > pricing.inventory) {
        errors.quantity = 'quantityTooMany'
      }
      if (!state.bicycleSelection?.durationHours) errors.duration = 'durationRequired'
      if (pricing.pickupSlots.length && !state.bicycleSelection?.pickupTime) {
        errors.startTime = 'startTimeRequired'
      }
      break
    }

    case 'guidedRide': {
      checkDate(errors, 'start', state.dates.start, today)
      const riders = state.bicycleSelection?.quantity ?? 0
      if (riders < 1) errors.quantity = 'quantityMin'
      else if (pricing.maxGroupSize && riders > pricing.maxGroupSize) {
        errors.quantity = 'groupTooLarge'
      }
      if (pricing.startTimes.length && !state.bicycleSelection?.pickupTime) {
        errors.startTime = 'startTimeRequired'
      }
      break
    }
  }

  return errors
}

export const validateContact = (contact: ContactDetails): StepErrors => {
  const errors: StepErrors = {}
  if (!contact.firstName.trim()) errors.firstName = 'required'
  if (!contact.email.trim()) errors.email = 'required'
  else if (!isValidEmail(contact.email)) errors.email = 'emailInvalid'
  // The team confirms every booking by phone or WhatsApp, so a number is required.
  if (!contact.phone.trim()) errors.phone = 'required'
  else if (!isValidPhone(contact.phone)) errors.phone = 'phoneInvalid'
  return errors
}
