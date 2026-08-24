import type { Access, FieldAccess } from 'payload'

/**
 * Spec Section 4. Four roles, in descending order of reach:
 *
 *   admin   — everything, including Users, Globals, booking pricing and internalNotes.
 *   manager — full CRUD on the services named in their `allowedServices`; may read and
 *             update Bookings and QuoteRequests but never delete a Booking.
 *   editor  — creates and updates content but cannot publish it, and is kept away from
 *             Bookings and QuoteRequests entirely (customer PII).
 *   support — reads all content; reads and updates Bookings and QuoteRequests so they
 *             can service customers; no pricing config, no Users.
 */
export type Role = 'admin' | 'manager' | 'editor' | 'support'

/** The four bookable services a manager's access can be scoped to. */
export type Service = 'tours' | 'hotels' | 'transfers' | 'bicycles'

type MaybeUser =
  | { id?: string; roles?: string[] | null; allowedServices?: string[] | null }
  | null
  | undefined

export const hasRole = (user: MaybeUser, ...roles: Role[]): boolean =>
  Boolean(user?.roles?.some((role) => roles.includes(role as Role)))

/**
 * Admins are implicitly scoped to every service; a manager is limited to the ones
 * ticked on their user document. Anyone else is decided by their role alone.
 */
const managesService = (user: MaybeUser, service: Service): boolean => {
  if (hasRole(user, 'admin')) return true
  if (!hasRole(user, 'manager')) return false
  return Boolean(user?.allowedServices?.includes(service))
}

export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => hasRole(user as MaybeUser, 'admin')

export const isAdminOrManager: Access = ({ req: { user } }) =>
  hasRole(user as MaybeUser, 'admin', 'manager')

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) =>
  hasRole(user as MaybeUser, 'admin')

export const isAdminOrManagerFieldLevel: FieldAccess = ({ req: { user } }) =>
  hasRole(user as MaybeUser, 'admin', 'manager')

/** Any signed-in staff member, whatever their role. */
export const isStaff: Access = ({ req: { user } }) =>
  hasRole(user as MaybeUser, 'admin', 'manager', 'editor', 'support')

export const isEditor: Access = ({ req: { user } }) =>
  hasRole(user as MaybeUser, 'admin', 'manager', 'editor')

/** Admins manage everyone; every other user may only read/update their own document. */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  const u = user as MaybeUser
  if (!u) return false
  if (hasRole(u, 'admin')) return true
  return { id: { equals: u.id } }
}

/**
 * Public traffic only ever sees published documents; signed-in staff see drafts too so
 * the admin panel's live preview and the editor's own drafts keep working.
 */
export const publishedOrStaff: Access = ({ req: { user } }) => {
  if (hasRole(user as MaybeUser, 'admin', 'manager', 'editor', 'support')) return true
  return { _status: { equals: 'published' } }
}

/** Retained under its original name so existing collections keep compiling. */
export const publishedOrEditor = publishedOrStaff

// ---------------------------------------------------------------------------
// Service-scoped access for Tours / Hotels / Transfers / Bicycles
// ---------------------------------------------------------------------------

/** Create + update: admins, managers of that service, and editors (who cannot publish). */
export const canWriteService =
  (service: Service): Access =>
  ({ req: { user } }) => {
    const u = user as MaybeUser
    if (managesService(u, service)) return true
    return hasRole(u, 'editor')
  }

/** Delete is reserved for admins and the managers who own that service. */
export const canDeleteService =
  (service: Service): Access =>
  ({ req: { user } }) =>
    managesService(user as MaybeUser, service)

/**
 * Publishing gate. Editors may write drafts but not set `_status: published`, so the
 * `_status` field itself is locked to manager and above.
 *
 * Payload evaluates field access per-request rather than per-value, so this blocks an
 * editor from touching `_status` at all — which is exactly the "submit a draft, a
 * manager publishes it" workflow Section 4 asks for.
 */
export const canPublishService =
  (service: Service): FieldAccess =>
  ({ req: { user } }) =>
    managesService(user as MaybeUser, service)

// ---------------------------------------------------------------------------
// Bookings + QuoteRequests — customer PII, so editors are excluded entirely
// ---------------------------------------------------------------------------

export const canReadBookings: Access = ({ req: { user } }) =>
  hasRole(user as MaybeUser, 'admin', 'manager', 'support')

export const canUpdateBookings: Access = ({ req: { user } }) =>
  hasRole(user as MaybeUser, 'admin', 'manager', 'support')

/** Section 4: managers explicitly cannot delete bookings. Admins only. */
export const canDeleteBookings: Access = isAdmin

/** The public booking form creates documents through the Local API with overrideAccess. */
export const canCreateBookings: Access = ({ req: { user } }) =>
  hasRole(user as MaybeUser, 'admin', 'manager', 'support')
