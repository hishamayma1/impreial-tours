import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  /**
   * Everything except:
   *  - /api      (Payload REST + GraphQL)
   *  - /admin    (Payload dashboard — it owns its own routing)
   *  - /media    (uploaded files)
   *  - /_next, /_vercel and any path with a file extension
   *
   * The dot in the final alternative MUST stay double-escaped: this is a JS string,
   * so `\.` is what leaves a literal `\.` in the regex Next compiles. Written as a
   * single `\.` the escape is dropped at parse time, the alternative degrades to
   * `.*..*` — "any path of at least one character" — and the negative lookahead then
   * rejects every route except `/`, silently disabling the middleware site-wide.
   */
  matcher: ['/((?!api|admin|media|_next|_vercel|.*\\..*).*)'],
}
