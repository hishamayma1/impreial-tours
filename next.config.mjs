import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
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
