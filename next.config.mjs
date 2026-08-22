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
  experimental: {
    // Payload's local API pulls in a large server graph; keep it out of the client bundle.
    optimizePackageImports: ['@payloadcms/ui'],
  },
}

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
