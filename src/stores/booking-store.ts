'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { Occupancy } from '@/lib/pricing'

export type ServiceType = 'dailyTour' | 'experience' | 'hotel' | 'transfer' | 'bicycle'

/** Just enough of the product to render the summary — never the whole catalogue record. */
export type ItemSnapshot = {
  id: string
  slug: string
  label: string
  image?: string | null
  basePrice?: number | null
}

export type RoomSelection = {
  roomTypeId: string
  roomName: string
  occupancy: Occupancy
  guests: number
  quantity: number
  /** Per-person, per-night rate, for display only. */
  unitPrice: number
}

export type TransferDetails = {
  pickup: string
  dropoff: string
  flightNumber: string
  vehicleClass: string
  pickupTime: string
  roundTrip: boolean
  unitPrice: number
}

export type BicycleSelection = {
  durationLabel: string
  durationHours: number
  quantity: number
  pickupDate: string
  pickupTime: string
  returnTime: string
  /** Requests, not prices: the server re-reads both rates from the CMS. */
  weekend: boolean
  delivery: boolean
  unitPrice: number
}

export type ContactDetails = {
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  notes: string
}

type BookingState = {
  serviceType: ServiceType | null
  itemId: string | null
  itemSnapshot: ItemSnapshot | null
  dates: { start: string | null; end: string | null }
  travelers: { adults: number; children: number; infants: number }
  hotelSelection: RoomSelection[]
  transferDetails: TransferDetails | null
  bicycleSelection: BicycleSelection | null
  extras: Array<{ id: string; label: string; price: number }>
  contact: ContactDetails
  currentStep: number
  hydrated: boolean

  setService: (serviceType: ServiceType, item: ItemSnapshot) => void
  setDates: (start: string | null, end: string | null) => void
  setTravelers: (travelers: Partial<BookingState['travelers']>) => void
  addRoom: (room: RoomSelection) => void
  removeRoom: (roomTypeId: string, occupancy: Occupancy) => void
  updateOccupancy: (roomTypeId: string, occupancy: Occupancy, guests: number) => void
  setTransferDetails: (details: Partial<TransferDetails>) => void
  setBicycleSelection: (selection: Partial<BicycleSelection>) => void
  setContact: (contact: Partial<ContactDetails>) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  reset: () => void
  setHydrated: (hydrated: boolean) => void
}

export const TOTAL_STEPS = 3

const emptyContact: ContactDetails = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  notes: '',
}

const initialState = {
  serviceType: null,
  itemId: null,
  itemSnapshot: null,
  dates: { start: null, end: null },
  travelers: { adults: 2, children: 0, infants: 0 },
  hotelSelection: [],
  transferDetails: null,
  bicycleSelection: null,
  extras: [],
  contact: emptyContact,
  currentStep: 0,
} satisfies Omit<BookingState, 'hydrated' | keyof BookingActions>

type BookingActions = Pick<
  BookingState,
  | 'setService' | 'setDates' | 'setTravelers' | 'addRoom' | 'removeRoom'
  | 'updateOccupancy' | 'setTransferDetails' | 'setBicycleSelection' | 'setContact'
  | 'nextStep' | 'prevStep' | 'goToStep' | 'reset' | 'setHydrated'
>

/**
 * The in-progress booking. Persisted to sessionStorage so a refresh mid-checkout does
 * not lose the basket, but scoped to the tab — a booking is not something to resume
 * next week.
 *
 * `partialize` deliberately excludes `currentStep` and `hydrated`: reopening should
 * restore what was chosen, not where the wizard was, and hydration is runtime state.
 *
 * Prices held here are for DISPLAY ONLY. The checkout route handler recomputes the
 * authoritative total from the CMS before writing a Booking.
 */
export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      ...initialState,
      hydrated: false,

      setService: (serviceType, item) =>
        set({ serviceType, itemId: item.id, itemSnapshot: item }),

      setDates: (start, end) => set({ dates: { start, end } }),

      setTravelers: (travelers) =>
        set((state) => ({ travelers: { ...state.travelers, ...travelers } })),

      addRoom: (room) =>
        set((state) => {
          const index = state.hotelSelection.findIndex(
            (r) => r.roomTypeId === room.roomTypeId && r.occupancy === room.occupancy,
          )
          // Same room at the same occupancy increments quantity rather than duplicating.
          if (index === -1) return { hotelSelection: [...state.hotelSelection, room] }

          const next = [...state.hotelSelection]
          next[index] = { ...next[index], quantity: next[index].quantity + room.quantity }
          return { hotelSelection: next }
        }),

      removeRoom: (roomTypeId, occupancy) =>
        set((state) => ({
          hotelSelection: state.hotelSelection.filter(
            (r) => !(r.roomTypeId === roomTypeId && r.occupancy === occupancy),
          ),
        })),

      updateOccupancy: (roomTypeId, occupancy, guests) =>
        set((state) => ({
          hotelSelection: state.hotelSelection.map((r) =>
            r.roomTypeId === roomTypeId && r.occupancy === occupancy ? { ...r, guests } : r,
          ),
        })),

      setTransferDetails: (details) =>
        set((state) => ({
          transferDetails: {
            pickup: '', dropoff: '', flightNumber: '', vehicleClass: '',
            pickupTime: '', roundTrip: false, unitPrice: 0,
            ...state.transferDetails,
            ...details,
          },
        })),

      setBicycleSelection: (selection) =>
        set((state) => ({
          bicycleSelection: {
            durationLabel: '', durationHours: 0, quantity: 1,
            pickupDate: '', pickupTime: '', returnTime: '',
            weekend: false, delivery: false, unitPrice: 0,
            ...state.bicycleSelection,
            ...selection,
          },
        })),

      setContact: (contact) => set((state) => ({ contact: { ...state.contact, ...contact } })),

      nextStep: () =>
        set((state) => ({ currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
      goToStep: (step) =>
        set({ currentStep: Math.min(Math.max(step, 0), TOTAL_STEPS - 1) }),

      reset: () => set({ ...initialState }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'imperial-tours.booking',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({
        serviceType, itemId, itemSnapshot, dates, travelers,
        hotelSelection, transferDetails, bicycleSelection, extras, contact,
      }) => ({
        serviceType, itemId, itemSnapshot, dates, travelers,
        hotelSelection, transferDetails, bicycleSelection, extras, contact,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
)

/**
 * Running total for the summary panel. A plain function over state rather than a
 * selector returning a new object, so subscribing components do not re-render on
 * every unrelated change (Section 6's performance rules).
 */
export const selectEstimatedTotal = (state: BookingState): number => {
  let total = 0

  for (const room of state.hotelSelection) {
    total += room.unitPrice * room.guests * room.quantity
  }

  if (state.transferDetails) {
    total += state.transferDetails.unitPrice * (state.transferDetails.roundTrip ? 2 : 1)
  }

  if (state.bicycleSelection) {
    total += state.bicycleSelection.unitPrice * state.bicycleSelection.quantity
  }

  if (
    state.itemSnapshot?.basePrice &&
    (state.serviceType === 'dailyTour' || state.serviceType === 'experience')
  ) {
    const { adults, children } = state.travelers
    total += state.itemSnapshot.basePrice * (adults + children)
  }

  for (const extra of state.extras) total += extra.price

  return Math.round(total * 100) / 100
}
