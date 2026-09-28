import Link from 'next/link'

import { defaultLocale } from '@/i18n/routing'
import { getSiteSettings } from '@/lib/payload/queries'

/**
 * The Imperial Tours brand inside the dashboard: the same logo the website header
 * shows, read from Site Settings through the same cached query, so replacing the logo
 * in the CMS updates the site and the dashboard together.
 *
 * Falls back to the pyramid mark from `app/icon.svg` when no logo is uploaded (or the
 * settings read fails), so the dashboard is never left showing Payload's own logo.
 */

const getBrand = async () => {
  const settings = await getSiteSettings(defaultLocale)
  return { name: settings.brandName || 'IMPERIAL TOURS', logo: settings.logo }
}

const FallbackMark = () => (
  <svg viewBox="0 0 64 64" aria-hidden className="it-brand__svg">
    <rect width="64" height="64" rx="32" fill="#10223b" />
    <path
      d="M32 15 50 46H14z"
      fill="none"
      stroke="#e7c092"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <path d="M32 15v31M22 38h20" stroke="#e7c092" strokeWidth="2" opacity=".55" />
  </svg>
)

const Mark = ({ logo, size }: { logo: { url: string } | null; size: 'sm' | 'md' | 'lg' }) => (
  <span className={`it-brand__mark it-brand__mark--${size}`}>
    {logo ? (
      // A plain <img>: the admin has no next/image loader config of its own, and this
      // is a ~40px thumbnail that the browser caches after the first page.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo.url} alt="" />
    ) : (
      <FallbackMark />
    )}
  </span>
)

/** Login screen (`graphics.Logo`): the full lockup. */
export const BrandLogo = async () => {
  const { name, logo } = await getBrand()
  return (
    <span className="it-brand it-brand--login">
      <Mark logo={logo} size="lg" />
      <span className="it-brand__text">
        <span className="it-brand__name">{name}</span>
        <span className="it-brand__caption">Staff dashboard</span>
      </span>
    </span>
  )
}

/** Top bar breadcrumb home link (`graphics.Icon`): the mark alone. */
export const BrandIcon = async () => {
  const { name, logo } = await getBrand()
  return (
    <span className="it-brand it-brand--icon" title={name}>
      <Mark logo={logo} size="sm" />
    </span>
  )
}

/** Top of the side navigation (`beforeNavLinks`): mark and name, linking home. */
export const NavBrand = async () => {
  const { name, logo } = await getBrand()
  return (
    <Link href="/admin" className="it-brand it-brand--nav" aria-label={`${name} dashboard`}>
      <Mark logo={logo} size="md" />
      <span className="it-brand__text">
        <span className="it-brand__name">{name}</span>
        <span className="it-brand__caption">Dashboard</span>
      </span>
    </Link>
  )
}
