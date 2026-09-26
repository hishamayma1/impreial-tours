'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { Occupancy, PriceTier, RoomTypeInput, SeasonalRate } from '@/lib/pricing'
import type { RentalBand } from '@/lib/rental-pricing'

export type ServiceType = 'dailyTour' | 'experience' | 'hotel' | 'transfer' | 'bicycle'

/**
 * The pricing rules of the chosen product, copied from the page the visitor booked from.
 *
 * The checkout route is static and has no item in its URL, so without these the wizard
 * could only guess at a price — which is how it used to show a hotel total with no
 * nights in it. Carrying the rules lets the wizard run the exact functions the server
 * runs (lib/pricing.ts) and show the figure that will actually be recorded.
 *
 * Display only: the server re-reads every one of these from the CMS on submit.
 */
export type ItemPricing =
  | {
      kind: 'dailyTour'
      pricePerPerson: number | null
      childPrice: number | null
      startTimes: string[]
      groupSizeMax: number | null
    }
  | {
      kind: 'experience'
      basePricePerPerson: number | null
      singleSupplement: number | null
      priceTiers: PriceTier[]
      groupSizeMax: number | null
      durationDays: number | null
    }
  | {
      kind: 'hotel'
      roomTypes: Array<RoomTypeInput & { id: string; roomName: string; maxOccupancy: number }>
      seasonalRates: SeasonalRate[]
      checkInTime: string
      checkOutTime: string
    }
  | {
      kind: 'bikeRental'
      config: {
        pricingMode: 'both' | 'bands' | 'hourly'
        hourlyRate: number | null
        extraHourRate: number | null
        minHours: number
        maxHours: number
        hourStep: number
        deliveryFee: number | null
        weekendSurchargePct: number | null
      }
      bands: RentalBand[]
      pickupSlots: string[]
      inventory: number | null
      deposit: number | null
    }
  | {
      kind: 'guidedRide'
      pricePerPerson: number | null
      startTimes: string[]
      durationHours: number | null
      maxGroupSize: number | null
      minAge: number | null
    }

/** Just enough of the product to render and price the checkout — never the whole record. */
export type ItemSnapshot = {
  id: string
  slug: string
  label: string
  image?: string | null
  basePrice?: number | null
  pricing?: ItemPricing
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

/** What a tour booking needs beyond a date and a headcount. */
export type TourOptions = {
  startTime: string
  /** Experiences only: travellers who want a room to themselves (single supplement). */
  singleRooms: number
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
  tourOptions: TourOptions
  extras: Array<{ id: string; label: string; price: number }>
  contact: ContactDetails
  currentStep: number
  hydrated: boolean

  setService: (serviceType: ServiceType, item: ItemSnapshot) => void
  setDates: (start: string | null, end: string | null) => void
  setTravelers: (travelers: Partial<BookingState['travelers']>) => void
  addRoom: (room: RoomSelection) => void
  removeRoom: (roomTypeId: string, occupancy: Occupancy) => void
  updateRoom: (
    roomTypeId: string,
    occupancy: Occupancy,
    patch: Partial<Pick<RoomSelection, 'guests' | 'quantity'>>,
  ) => void
  setTransferDetails: (details: Partial<TransferDetails>) => void
  setBicycleSelection: (selection: Partial<BicycleSelection>) => void
  setTourOptions: (options: Partial<TourOptions>) => void
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
  tourOptions: { startTime: '', singleRooms: 0 },
  extras: [],
  contact: emptyContact,
  currentStep: 0,
} satisfies Omit<BookingState, 'hydrated' | keyof BookingActions>

type BookingActions = Pick<
  BookingState,
  | 'setService' | 'setDates' | 'setTravelers' | 'addRoom' | 'removeRoom'
  | 'updateRoom' | 'setTransferDetails' | 'setBicycleSelection' | 'setTourOptions'
  | 'setContact' | 'nextStep' | 'prevStep' | 'goToStep' | 'reset' | 'setHydrated'
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

      /**
       * Starts a checkout for one product.
       *
       * Choosing a different product clears everything chosen for the last one. Without
       * that, a room reserved at one hotel stayed in the basket when the visitor went on
       * to reserve at another, and the server — finding no such room at the second
       * hotel — silently dropped it. The contact details survive: they describe the
       * person, not the product.
       */
      setService: (serviceType, item) =>
        set((state) => {
          const sameItem = state.itemId === item.id && state.serviceType === serviceType
          if (sameItem) return { itemSnapshot: item, currentStep: 0 }
          return {
            ...initialState,
            contact: state.contact,
            serviceType,
            itemId: item.id,
            itemSnapshot: item,
          }
        }),

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
          next[index] = {
            ...next[index],
            quantity: Math.min(10, next[index].quantity + room.quantity),
          }
          return { hotelSelection: next }
        }),

      removeRoom: (roomTypeId, occupancy) =>
        set((state) => ({
          hotelSelection: state.hotelSelection.filter(
            (r) => !(r.roomTypeId === roomTypeId && r.occupancy === occupancy),
          ),
        })),

      updateRoom: (roomTypeId, occupancy, patch) =>
        set((state) => ({
          hotelSelection: state.hotelSelection.map((r) =>
            r.roomTypeId === roomTypeId && r.occupancy === occupancy ? { ...r, ...patch } : r,
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

      setTourOptions: (options) =>
        set((state) => ({ tourOptions: { ...state.tourOptions, ...options } })),

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
      // Bumped with the snapshot's new pricing field: a basket saved by the previous
      // build has no rules to price with, so it is dropped rather than shown at zero.
      version: 2,
      migrate: () => ({ ...initialState }) as never,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({
        serviceType, itemId, itemSnapshot, dates, travelers, hotelSelection,
        transferDetails, bicycleSelection, tourOptions, extras, contact,
      }) => ({
        serviceType, itemId, itemSnapshot, dates, travelers, hotelSelection,
        transferDetails, bicycleSelection, tourOptions, extras, contact,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
)

export type BookingStateSnapshot = Pick<
  BookingState,
  | 'serviceType' | 'itemSnapshot' | 'dates' | 'travelers' | 'hotelSelection'
  | 'transferDetails' | 'bicycleSelection' | 'tourOptions' | 'extras' | 'contact'
>
