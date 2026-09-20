import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { uploadthingStorage } from '@payloadcms/storage-uploadthing'
import sharp from 'sharp'

import { locales, defaultLocale, localeLabels } from './i18n/routing'

import { Users } from './payload/collections/Users'
import { Media } from './payload/collections/Media'
import { Categories } from './payload/collections/Categories'
import { Services } from './payload/collections/Services'
import { Offers } from './payload/collections/Offers'
import { Destinations } from './payload/collections/Destinations'
import { Testimonials } from './payload/collections/Testimonials'
import { Posts } from './payload/collections/Posts'
import { Bookings } from './payload/collections/Bookings'
import { Tours } from './payload/collections/Tours'
import { Hotels } from './payload/collections/Hotels'
import { Transfers } from './payload/collections/Transfers'
import { Airports } from './payload/collections/Airports'
import { Bicycles } from './payload/collections/Bicycles'
import { QuoteRequests } from './payload/collections/QuoteRequests'
import { Pages } from './payload/collections/Pages'

import { emailAdapter } from './payload/email'
import { Header } from './payload/globals/Header'
import { Footer } from './payload/globals/Footer'
import { HomePage } from './payload/globals/HomePage'
import { SiteSettings } from './payload/globals/SiteSettings'
import { Navigation } from './payload/globals/Navigation'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    /**
     * The dashboard is locked to dark. Staff work in it all day against dense tables
     * of bookings and prices, and the dark palette in custom.scss is tuned for that
     * — see the contrast notes there. Set this to 'all' to give users the toggle back.
     */
    theme: 'dark',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Imperial Tours',
    },
    components: {
      // Section 4: the stats row above the dashboard's collection list.
      beforeDashboard: ['@/payload/components/Dashboard#Dashboard'],
    },
  },

  /**
   * Content localization mirrors the front-end routing config exactly, so adding a
   * language is a one-line change in src/i18n/routing.ts.
   */
  localization: {
    locales: locales.map((code) => ({
      code,
      label: localeLabels[code].label,
    })),
    defaultLocale,
    fallback: true,
  },

  collections: [
    // Services (spec Section 3)
    Tours,
    Hotels,
    Transfers,
    // The airports an airport transfer runs from, referenced by Transfers.
    Airports,
    Bicycles,
    // Sales
    Bookings,
    QuoteRequests,
    // Content
    Pages,
    Destinations,
    Media,
    // Pre-existing content collections, kept alongside the spec's model
    Services,
    Offers,
    Testimonials,
    Posts,
    Categories,
    // Settings
    Users,
  ],
  globals: [HomePage, Header, Navigation, Footer, SiteSettings],

  editor: lexicalEditor(),
  email: emailAdapter,
  secret: process.env.PAYLOAD_SECRET || '',
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
    connectOptions: {
      maxPoolSize: 20,
      /**
       * Fail fast when the cluster is unreachable. The driver's 30s default means a
       * page that makes several reads stacks up minutes of waiting before any of them
       * reports the outage — long enough for a request to be abandoned rather than
       * degrade to the empty state the front end is written to handle.
       */
      serverSelectionTimeoutMS: 8000,
    },
  }),
  sharp,

  typescript: {
    outputFile: path.resolve(dirname, 'types/payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(dirname, '..', 'schema.graphql'),
  },

  cors: [serverURL],
  csrf: [serverURL],
  plugins: [
    uploadthingStorage({
      collections: { media: true },
      options: {
        token: process.env.UPLOADTHING_TOKEN,
        acl: 'public-read',
      },
    }),
  ],
})
