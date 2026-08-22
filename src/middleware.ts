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
   */
  matcher: ['/((?!api|admin|media|_next|_vercel|.*\..*).*)'],
}
