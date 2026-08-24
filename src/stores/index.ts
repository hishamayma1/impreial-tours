export { useUIStore } from './ui-store'
export { useSearchStore, TOUR_TYPES, type TourType, type SearchCriteria } from './search-store'
export { usePreferencesStore, formatPrice } from './preferences-store'
export { useBookingStore, selectEstimatedTotal, TOTAL_STEPS } from './booking-store'
export type {
  ServiceType,
  ItemSnapshot,
  RoomSelection,
  TransferDetails,
  BicycleSelection,
  ContactDetails,
} from './booking-store'
export { useFilterStore, filtersToSearchParams, type FilterState } from './filter-store'

/**
 * Spec Section 6 calls this store `useCurrencyStore`. It already existed here as
 * `usePreferencesStore` (localStorage-persisted currency + hydration guard), so it is
 * aliased rather than duplicated — two stores owning the same value would drift.
 */
export { usePreferencesStore as useCurrencyStore } from './preferences-store'
export {
  useResourceStore,
  resourceKey,
  type ResourceKind,
} from './resource-store'
