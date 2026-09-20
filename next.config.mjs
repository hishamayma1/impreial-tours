import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    /**
     * Next's default is 60 seconds, which means the optimizer re-encodes the same
     * hero photograph roughly once a minute on a low-traffic site — sharp CPU spent
     * to produce a byte-identical file.
     *
     * 30 days is safe here because Payload never overwrites an upload in place: a
     * replaced image is stored under a new filename (`hero-2.webp`), so a new URL
     * misses this cache by construction. The cache only ever holds derivatives of a
     * source that cannot have changed.
     */
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // The storage-uploadthing adapter builds URLs against this fixed domain
      // (see generateURL in @payloadcms/storage-uploadthing), not a per-app subdomain.
      { protocol: 'https', hostname: 'utfs.io' },
      ...[process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'].map((url) => {
        const { protocol, hostname, port } = new URL(url)
        return { protocol: protocol.replace(':', ''), hostname, port }
      }),
    ],
  },
  /**
   * Silences the repeated PackFileCacheStrategy warning about next-intl's
   * `extractor/format/index.js` failing to parse at `import(t)`.
   *
   * That file belongs to next-intl's message extractor, which this app never runs —
   * webpack only reaches it while walking the package to collect build dependencies
   * for its filesystem cache. The specifier is genuinely unanalysable, nothing we
   * import depends on it, and it is re-emitted on every compile.
   *
   * It has to be silenced here rather than with `ignoreWarnings`: this is emitted by
   * webpack's *infrastructure* logger (the `<w>` prefix), which runs outside the
   * compilation, so warning filters never see it. `level: 'error'` is the only lever,
   * and it is applied in dev only so build-time infrastructure warnings still surface.
   */
  webpack: (config, { dev }) => {
    if (dev) config.infrastructureLogging = { ...config.infrastructureLogging, level: 'error' }
    return config
  },
  experimental: {
    // Payload's local API pulls in a large server graph; keep it out of the client bundle.
    optimizePackageImports: ['@payloadcms/ui'],
  },
}

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
