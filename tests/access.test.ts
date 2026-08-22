import {
  isAdmin, isAdminOrManager, isAdminOrSelf, isEditor, isStaff,
  publishedOrStaff, canWriteService, canDeleteService, canPublishService,
  canReadBookings, canUpdateBookings, canDeleteBookings, hasRole,
} from '../src/payload/access/index.ts'

let pass = 0, fail = 0
const check = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ok  ${name}`) }
  else { fail++; console.log(`FAIL  ${name}\n      got ${a}\n      want ${e}`) }
}

type U = { id?: string; roles?: string[]; allowedServices?: string[] } | null
const req = (user: U) => ({ req: { user } }) as never

const admin: U = { id: 'a1', roles: ['admin'] }
const tourManager: U = { id: 'm1', roles: ['manager'], allowedServices: ['tours'] }
const hotelManager: U = { id: 'm2', roles: ['manager'], allowedServices: ['hotels', 'bicycles'] }
const scopelessManager: U = { id: 'm3', roles: ['manager'] }
const editor: U = { id: 'e1', roles: ['editor'] }
const support: U = { id: 's1', roles: ['support'] }
const anon: U = null

console.log('--- roles ---')
check('hasRole matches', hasRole(admin, 'admin'), true)
check('hasRole rejects', hasRole(editor, 'admin'), false)
check('hasRole with no user', hasRole(anon, 'admin'), false)

console.log('\n--- isAdmin / isAdminOrManager ---')
check('admin is admin', isAdmin(req(admin)), true)
check('manager is not admin', isAdmin(req(tourManager)), false)
check('support is not admin', isAdmin(req(support)), false)
check('anon is not admin', isAdmin(req(anon)), false)
check('manager passes adminOrManager', isAdminOrManager(req(tourManager)), true)
check('editor fails adminOrManager', isAdminOrManager(req(editor)), false)

console.log('\n--- self-service on Users ---')
check('admin reads all users', isAdminOrSelf(req(admin)), true)
check('editor limited to own doc', isAdminOrSelf(req(editor)), { id: { equals: 'e1' } })
check('support limited to own doc', isAdminOrSelf(req(support)), { id: { equals: 's1' } })
check('anon denied', isAdminOrSelf(req(anon)), false)

console.log('\n--- public read is published-only ---')
check('anon sees published only', publishedOrStaff(req(anon)), { _status: { equals: 'published' } })
check('editor sees drafts', publishedOrStaff(req(editor)), true)
check('support sees drafts', publishedOrStaff(req(support)), true)

console.log('\n--- service scoping (Section 4: managers limited to allowedServices) ---')
const writeTours = canWriteService('tours')
const writeHotels = canWriteService('hotels')
check('admin writes tours', writeTours(req(admin)), true)
check('tour manager writes tours', writeTours(req(tourManager)), true)
check('tour manager CANNOT write hotels', writeHotels(req(tourManager)), false)
check('hotel manager writes hotels', writeHotels(req(hotelManager)), true)
check('hotel manager CANNOT write tours', writeTours(req(hotelManager)), false)
check('manager with no scope writes nothing', writeTours(req(scopelessManager)), false)
check('editor writes any content', writeTours(req(editor)), true)
check('support cannot write content', writeTours(req(support)), false)
check('anon cannot write content', writeTours(req(anon)), false)

console.log('\n--- delete is manager+ only ---')
const delTours = canDeleteService('tours')
check('admin deletes', delTours(req(admin)), true)
check('scoped manager deletes own service', delTours(req(tourManager)), true)
check('manager cannot delete other service', canDeleteService('hotels')(req(tourManager)), false)
check('editor CANNOT delete', delTours(req(editor)), false)
check('support CANNOT delete', delTours(req(support)), false)

console.log('\n--- publishing gate: editors draft, managers publish ---')
const pubTours = canPublishService('tours')
check('admin publishes', pubTours(req(admin)), true)
check('scoped manager publishes', pubTours(req(tourManager)), true)
check('editor CANNOT publish', pubTours(req(editor)), false)
check('out-of-scope manager cannot publish', pubTours(req(hotelManager)), false)

console.log('\n--- bookings: editors excluded entirely (customer PII) ---')
check('admin reads bookings', canReadBookings(req(admin)), true)
check('manager reads bookings', canReadBookings(req(tourManager)), true)
check('support reads bookings', canReadBookings(req(support)), true)
check('editor CANNOT read bookings', canReadBookings(req(editor)), false)
check('anon CANNOT read bookings', canReadBookings(req(anon)), false)
check('support updates bookings', canUpdateBookings(req(support)), true)
check('editor CANNOT update bookings', canUpdateBookings(req(editor)), false)

console.log('\n--- only admins delete bookings ---')
check('admin deletes bookings', canDeleteBookings(req(admin)), true)
check('manager CANNOT delete bookings', canDeleteBookings(req(tourManager)), false)
check('support CANNOT delete bookings', canDeleteBookings(req(support)), false)

console.log('\n--- staff / editor helpers ---')
check('support counts as staff', isStaff(req(support)), true)
check('anon is not staff', isStaff(req(anon)), false)
check('support is not editor', isEditor(req(support)), false)
check('manager counts as editor', isEditor(req(tourManager)), true)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
