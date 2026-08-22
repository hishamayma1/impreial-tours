import type { Access, FieldAccess } from 'payload'

type MaybeUser = { id?: string; roles?: string[] | null } | null | undefined

export const hasRole = (user: MaybeUser, ...roles: string[]): boolean =>
  Boolean(user?.roles?.some((role) => roles.includes(role)))

export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => hasRole(user as MaybeUser, 'admin')

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => hasRole(user as MaybeUser, 'admin')

export const isEditor: Access = ({ req: { user } }) => hasRole(user as MaybeUser, 'admin', 'editor')

/** Admins manage everyone; every other user may only read/update their own document. */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  const u = user as MaybeUser
  if (!u) return false
  if (hasRole(u, 'admin')) return true
  return { id: { equals: u.id } }
}

/**
 * Public traffic only ever sees published documents; signed-in staff see drafts too
 * so the admin panel's live preview keeps working.
 */
export const publishedOrEditor: Access = ({ req: { user } }) => {
  if (hasRole(user as MaybeUser, 'admin', 'editor')) return true
  return { _status: { equals: 'published' } }
}
